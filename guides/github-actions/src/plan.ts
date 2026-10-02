/**
 * Pull-request preview: what a deploy of this tree would create or change.
 * Needs only the Fractal service account — no AWS credentials, no writes.
 *
 * Mirrors deploy's own decisions: create when absent or Deleted; update when the
 * name, the resource groups, or the parameters after the merge deploy performs
 * (`mergeEnvironmentParameters`) differ — compared key-order-insensitively, as
 * deploy does. It also reports the one refusal deploy can only make once it has
 * read the management environment: an operational networkTier the STORED
 * management tier would override.
 */
import {
  createFractalCloudClient,
  mergeEnvironmentParameters,
  resolveEnvironment,
  type EnvironmentDetails,
  type ResolvedEnvironment,
} from '@fractal_cloud/sdk';
import {management, OWNER_ID} from './environments';

/** JSON with recursively sorted keys, so property order is not drift. */
const stable = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stable).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map(k => `${JSON.stringify(k)}:${stable(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};

const tierOf = (parameters: Record<string, unknown> | undefined): string => {
  const key = Object.keys(parameters ?? {}).find(
    k => k.toLowerCase() === 'networktier',
  );
  const value = key === undefined ? undefined : parameters![key];
  return value === undefined || value === null
    ? ''
    : String(value).trim().toLowerCase();
};

const changes = (
  env: ResolvedEnvironment,
  stored: EnvironmentDetails,
): string[] => {
  const out: string[] = [];
  if (stored.name !== env.name) {
    out.push('name');
  }
  if (
    stable([...stored.resourceGroups].sort()) !==
    stable([...env.resourceGroups].sort())
  ) {
    out.push('resourceGroups');
  }
  const next = mergeEnvironmentParameters(stored.parameters, env.parameters);
  const keys = new Set([
    ...Object.keys(stored.parameters),
    ...Object.keys(next),
  ]);
  for (const k of keys) {
    if (stable(stored.parameters[k]) !== stable(next[k])) {
      out.push(`parameters.${k}`);
    }
  }
  return out;
};

const required = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
};

const cloud = createFractalCloudClient({
  clientId: required('SERVICE_ACCOUNT_ID'),
  clientSecret: required('SERVICE_ACCOUNT_SECRET'),
});

// Validates the whole tree (throws with every error at once).
const tree = resolveEnvironment(management);
const listed = new Map(
  (
    await cloud.environments.list({type: 'Organizational', ownerId: OWNER_ID})
  ).map(e => [e.id.shortName, e]),
);

let refused = false;
let managementTier = '';
for (const env of [tree.management, ...tree.operationals]) {
  const isManagement = env === tree.management;
  const summary = listed.get(env.id.shortName);
  const stored =
    summary === undefined || summary.status.toLowerCase() === 'deleted'
      ? null
      : await cloud.environments.get(env.id);
  const after =
    stored === null
      ? env.parameters
      : mergeEnvironmentParameters(stored.parameters, env.parameters);
  if (isManagement) {
    managementTier = tierOf(after);
  } else {
    const opTier = tierOf(env.parameters);
    if (opTier !== '' && managementTier !== '' && opTier !== managementTier) {
      console.log(
        `! ${env.id.shortName}: networkTier '${opTier}' would be refused — the ` +
          `management environment stores '${managementTier}'`,
      );
      refused = true;
      continue;
    }
  }
  if (stored === null) {
    console.log(`+ create ${env.id.shortName}`);
    continue;
  }
  const changed = changes(env, stored);
  console.log(
    changed.length === 0
      ? `= ${env.id.shortName} (${stored.status}, initialized: ${summary?.initializedClouds.join(',') || 'none'})`
      : `~ update ${env.id.shortName}: ${changed.join(', ')}`,
  );
}
if (refused) {
  process.exitCode = 1;
}
