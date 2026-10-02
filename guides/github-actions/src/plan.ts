/**
 * Pull-request preview: what a deploy of this tree would create or change.
 * Needs only the Fractal service account — no AWS credentials, no writes.
 */
import {
  createFractalCloudClient,
  mergeEnvironmentParameters,
  resolveEnvironment,
} from '@fractal_cloud/sdk';
import {management, OWNER_ID} from './environments';

const cloud = createFractalCloudClient({
  clientId: process.env.SERVICE_ACCOUNT_ID!,
  clientSecret: process.env.SERVICE_ACCOUNT_SECRET!,
});

// Validates the whole tree (throws with every error at once).
const tree = resolveEnvironment(management);
const existing = new Map(
  (
    await cloud.environments.list({type: 'Organizational', ownerId: OWNER_ID})
  ).map(e => [e.id.shortName, e]),
);

for (const env of [tree.management, ...tree.operationals]) {
  const summary = existing.get(env.id.shortName);
  if (summary === undefined || summary.status === 'Deleted') {
    console.log(`+ create ${env.id.shortName}`);
    continue;
  }
  const stored = await cloud.environments.get(env.id);
  const current = stored?.parameters ?? {};
  const next = mergeEnvironmentParameters(current, env.parameters);
  const changed = [
    ...new Set([...Object.keys(current), ...Object.keys(next)]),
  ].filter(k => JSON.stringify(current[k]) !== JSON.stringify(next[k]));
  console.log(
    changed.length === 0
      ? `= ${env.id.shortName} (${summary.status}, initialized: ${summary.initializedClouds.join(',') || 'none'})`
      : `~ update ${env.id.shortName}: ${changed.join(', ')}`,
  );
}
