/**
 * environment/service.ts — deploy an Environment tree to the Fractal Cloud API.
 *
 * Mirrors the Java SDK RestEnvironmentService + EnvironmentAggregate +
 * Automaton.instantiate(environment): create/update the management env and each
 * operational env, push secrets and CI/CD profiles (bulk), then initialize each
 * cloud agent — either fire-and-forget or waiting for each initialization to
 * complete (polling the initializer status endpoint).
 *
 * Endpoints (base `${FRACTAL_API_URL}/environments`):
 *   GET|POST|PUT  /{type}/{ownerId}/{shortName}
 *   POST          /{...}/secrets/bulk
 *   POST          /{...}/ci-cd-profiles/bulk
 *   POST          /{...}/initializer/{provider}/initialize
 *   GET           /{...}/initializer/{provider}/status
 *
 * NOT runtime-verified here (no Fractal Cloud credentials) — covered by mocked
 * HTTP unit tests; smoke against the live API before release.
 */
import superagent from 'superagent';
import {
  FRACTAL_API_URL,
  authHeaders,
  sleep,
  elapsedSec,
  log,
  type Credentials,
} from '../http';
import type {
  CiCdProfile,
  EnvironmentId,
  ProviderCredentials,
  Secret,
} from './types';
import {formatEnvironmentId} from './types';
import type {CloudAgent} from './cloud_agents';
import {
  resolveEnvironment,
  type ManagementEnvironmentNode,
  type ResolvedEnvironment,
} from './environment';

const ENVIRONMENTS_URL = `${FRACTAL_API_URL}/environments`;
const DEFAULT_AGENT_POLL_INTERVAL_MS = 30_000;
const DEFAULT_AGENT_TIMEOUT_MS = 55 * 60_000;

export type DeployEnvironmentOptions = {
  /** Credentials for the cloud agents you initialize (throws if a needed
   *  provider's credentials are absent). */
  providerCredentials?: ProviderCredentials;
  /** `wait` polls each cloud-agent initialization to completion; `fire-and-forget`
   *  starts them and returns. Default `fire-and-forget`. */
  agentInit?: 'wait' | 'fire-and-forget';
  quiet?: boolean;
  pollIntervalMs?: number;
  timeoutMs?: number;
};

// ── DTOs (shapes the API returns / expects) ────────────────────────────────────
type EnvironmentIdDto = {type: string; ownerId: string; shortName: string};
type EnvironmentResponse = {
  id: EnvironmentIdDto;
  name: string;
  resourceGroups: string[];
  parameters: Record<string, unknown>;
  defaultCiCdProfileShortName?: string | null;
  status: string;
};
type InitializationStep = {
  order?: number;
  resourceName?: string;
  resourceType?: string;
  status: string;
  lastOperationStatusMessage?: string;
};
type InitializationRun = {
  cloudProvider?: string;
  status: string;
  steps?: InitializationStep[];
};

const idDto = (id: EnvironmentId): EnvironmentIdDto => ({
  type: id.type,
  ownerId: id.ownerId,
  shortName: id.shortName,
});

const envUri = (env: ResolvedEnvironment, path = ''): string => {
  const base = `${ENVIRONMENTS_URL}/${formatEnvironmentId(env.id)}`;
  return path ? `${base}/${path}` : base;
};

// ── low-level HTTP ─────────────────────────────────────────────────────────────
const fetchEnvironment = async (
  env: ResolvedEnvironment,
  creds: Credentials,
): Promise<EnvironmentResponse | null> => {
  const res = await superagent
    .get(envUri(env))
    .ok(r => r.status === 200 || r.status === 404)
    .set(authHeaders(creds));
  return res.status === 200 ? (res.body as EnvironmentResponse) : null;
};

const createEnvironment = async (
  env: ResolvedEnvironment,
  isManagement: boolean,
  creds: Credentials,
): Promise<void> => {
  await superagent
    .post(envUri(env))
    .ok(r => r.status === 201)
    .set(authHeaders(creds))
    .send({
      managementEnvironmentId: isManagement ? null : idDto(env.managementId),
      name: env.name,
      resourceGroups: env.resourceGroups,
      parameters: env.parameters,
    });
};

const updateEnvironment = async (
  env: ResolvedEnvironment,
  creds: Credentials,
  defaultCiCdProfileShortName: string | null,
): Promise<void> => {
  await superagent
    .put(envUri(env))
    .ok(r => r.status === 200)
    .set(authHeaders(creds))
    .send({
      managementEnvironmentId: idDto(env.managementId),
      name: env.name,
      resourceGroups: env.resourceGroups,
      parameters: env.parameters,
      defaultCiCdProfileShortName,
    });
};

const manageSecrets = async (
  env: ResolvedEnvironment,
  creds: Credentials,
): Promise<void> => {
  if (env.secrets.length === 0) {
    return;
  }
  await superagent
    .post(envUri(env, 'secrets/bulk'))
    .ok(r => r.status === 201 || r.status === 404)
    .set(authHeaders(creds))
    .send(env.secrets as Secret[]);
};

const manageCiCdProfiles = async (
  env: ResolvedEnvironment,
  creds: Credentials,
  currentDefault: string | null,
): Promise<void> => {
  if (env.defaultCiCdProfile === undefined) {
    // Clear an existing default if one was set previously.
    if (
      currentDefault !== null &&
      currentDefault !== undefined &&
      currentDefault !== ''
    ) {
      await updateEnvironment(env, creds, null);
    }
    return;
  }
  const profiles: CiCdProfile[] = [env.defaultCiCdProfile, ...env.ciCdProfiles];
  await superagent
    .post(envUri(env, 'ci-cd-profiles/bulk'))
    .ok(r => r.status === 201 || r.status === 404)
    .set(authHeaders(creds))
    .send(profiles);
  if (env.defaultCiCdProfile.shortName !== currentDefault) {
    await updateEnvironment(env, creds, env.defaultCiCdProfile.shortName);
  }
};

// ── cloud-agent initialization ─────────────────────────────────────────────────
const providerPath: Record<CloudAgent['provider'], string> = {
  AWS: 'aws',
  AZURE: 'azure',
  GCP: 'gcp',
  OCI: 'oci',
  HETZNER: 'hetzner',
};

const missingCreds = (provider: string): Error =>
  new Error(
    `Cloud-agent initialization for ${provider} requires providerCredentials.${provider.toLowerCase()} but none were supplied.`,
  );

/** Build the provider credential headers for an agent's initialize call. */
const initHeaders = (
  agent: CloudAgent,
  pc: ProviderCredentials | undefined,
): Record<string, string> => {
  switch (agent.provider) {
    case 'AWS': {
      const c = pc?.aws;
      if (!c) {
        throw missingCreds('AWS');
      }
      const headers: Record<string, string> = {
        'X-AWS-Access-Key-ID': c.accessKeyId,
        'X-AWS-Secret-Access-Key': c.secretAccessKey,
      };
      if (c.sessionToken) {
        headers['X-AWS-Session-Token'] = c.sessionToken;
      }
      return headers;
    }
    case 'AZURE': {
      const c = pc?.azure;
      if (!c) {
        throw missingCreds('AZURE');
      }
      return {
        'X-Azure-SP-Client-ID': c.spClientId,
        'X-Azure-SP-Client-Secret': c.spClientSecret,
      };
    }
    case 'GCP': {
      const c = pc?.gcp;
      if (!c) {
        throw missingCreds('GCP');
      }
      return {
        'X-GCP-Service-Account-Email': c.serviceAccountEmail,
        'X-GCP-Service-Account-Credentials': c.serviceAccountCredentials,
      };
    }
    case 'OCI': {
      const c = pc?.oci;
      if (!c) {
        throw missingCreds('OCI');
      }
      return {
        'X-OCI-Service-Account-ID': c.serviceAccountId,
        'X-OCI-Service-Account-Credentials': c.serviceAccountCredentials,
      };
    }
    case 'HETZNER': {
      const c = pc?.hetzner;
      if (!c) {
        throw missingCreds('HETZNER');
      }
      return {'X-Hetzner-Token': c.token};
    }
  }
};

/** Build the initialize request body for an agent (provider-specific shape). */
const initBody = (
  agent: CloudAgent,
  env: ResolvedEnvironment,
): Record<string, unknown> => {
  const tags = (env.parameters.tags as Record<string, string>) ?? {};
  switch (agent.provider) {
    case 'AWS':
      return {
        organizationId: agent.organizationId,
        accountId: agent.accountId,
        region: agent.region,
        tags,
      };
    case 'AZURE':
      return {
        managementEnvironmentId: idDto(env.managementId),
        tenantId: agent.tenantId,
        subscriptionId: agent.subscriptionId,
        region: agent.region,
        tags,
      };
    case 'GCP':
      return {
        organizationId: agent.organizationId,
        projectId: agent.projectId,
        region: agent.region,
        tags,
      };
    case 'OCI':
      return {
        tenancyId: agent.tenancyId,
        compartmentId: agent.compartmentId,
        region: agent.region,
        tags,
      };
    case 'HETZNER':
      return {projectId: agent.projectId, region: agent.region, tags};
  }
};

const fetchInitializationStatus = async (
  env: ResolvedEnvironment,
  provider: CloudAgent['provider'],
  creds: Credentials,
): Promise<InitializationRun | null> => {
  const res = await superagent
    .get(envUri(env, `initializer/${providerPath[provider]}/status`))
    .ok(r => r.status === 200 || r.status === 404)
    .set(authHeaders(creds));
  if (res.status === 404 || res.body === undefined || res.body === null) {
    return null;
  }
  const body = res.body as {initializationRun?: InitializationRun};
  return body.initializationRun ?? null;
};

const STEP_SYMBOL: Record<string, string> = {
  Completed: '✅',
  InProgress: '🚧',
  Failed: '❌',
  NotStarted: '⏳',
};

const logSteps = (
  quiet: boolean,
  envId: string,
  provider: string,
  run: InitializationRun,
): void => {
  const steps = [...(run.steps ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  for (const step of steps) {
    log(
      quiet,
      'CHECK',
      `  ${STEP_SYMBOL[step.status] ?? ''} ${step.resourceName ?? ''}`,
      {
        env: envId,
        provider,
        type: step.resourceType ?? '',
        status: step.status,
      },
    );
  }
};

const failureMessage = (provider: string, run: InitializationRun): string => {
  const failed = (run.steps ?? []).filter(s => s.status === 'Failed');
  if (failed.length === 0) {
    return `${provider} cloud-agent initialization reported Failed with no failing steps yet; still in progress.`;
  }
  const lines = failed.map(
    s =>
      `      - ${s.resourceName ?? '(unknown)'}: ${s.lastOperationStatusMessage ?? 'Failed'}`,
  );
  return `${provider} cloud-agent initialization failed:\n${lines.join('\n')}`;
};

const initializeAgent = async (
  env: ResolvedEnvironment,
  agent: CloudAgent,
  creds: Credentials,
  opts: {
    agentInit: 'wait' | 'fire-and-forget';
    pollIntervalMs: number;
    timeoutMs: number;
    quiet: boolean;
    providerCredentials?: ProviderCredentials;
  },
): Promise<void> => {
  const envId = formatEnvironmentId(env.id);
  const provider = agent.provider;

  // (Re)start only if there is no current run or the last one failed/cancelled.
  const current = await fetchInitializationStatus(env, provider, creds);
  const needsStart =
    current === null ||
    current.status === 'Failed' ||
    current.status === 'Cancelled';

  if (needsStart) {
    log(opts.quiet, 'INFO', 'Starting cloud-agent initialization', {
      env: envId,
      provider,
    });
    await superagent
      .post(envUri(env, `initializer/${providerPath[provider]}/initialize`))
      .ok(r => r.status === 202)
      .set(authHeaders(creds))
      .set(initHeaders(agent, opts.providerCredentials))
      .send(initBody(agent, env));
  }

  if (opts.agentInit === 'fire-and-forget') {
    return;
  }

  const startMs = Date.now();
  const deadline = startMs + opts.timeoutMs;
  let round = 0;
  while (Date.now() < deadline) {
    round++;
    const run = await fetchInitializationStatus(env, provider, creds);
    if (run !== null) {
      logSteps(opts.quiet, envId, provider, run);
      switch (run.status) {
        case 'Completed':
          log(opts.quiet, 'INFO', 'Cloud-agent initialization completed', {
            env: envId,
            provider,
            elapsed: elapsedSec(startMs),
          });
          return;
        case 'Cancelled':
          log(opts.quiet, 'ERROR', 'Cloud-agent initialization cancelled', {
            env: envId,
            provider,
            elapsed: elapsedSec(startMs),
          });
          throw new Error(
            `${provider} cloud-agent initialization was cancelled.`,
          );
        case 'Failed': {
          const failing = (run.steps ?? []).some(s => s.status === 'Failed');
          if (failing) {
            log(opts.quiet, 'ERROR', 'Cloud-agent initialization failed', {
              env: envId,
              provider,
              elapsed: elapsedSec(startMs),
            });
            throw new Error(failureMessage(provider, run));
          }
          break; // no failing step yet → keep polling
        }
        default:
          log(opts.quiet, 'CHECK', 'Polling cloud-agent initialization', {
            env: envId,
            provider,
            round,
            status: run.status,
            elapsed: elapsedSec(startMs),
          });
      }
    }
    await sleep(opts.pollIntervalMs);
  }
  log(opts.quiet, 'ERROR', 'Cloud-agent initialization timed out', {
    env: envId,
    provider,
    elapsed: elapsedSec(startMs),
    timeoutMs: opts.timeoutMs,
  });
  throw new Error(`${provider} cloud-agent initialization timed out.`);
};

// ── create/update one environment ──────────────────────────────────────────────
/** Deterministic JSON with recursively key-sorted objects, so property insertion
 *  order does not affect equality (the API may return keys in a different order). */
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map(k => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};

const needsUpdate = (
  env: ResolvedEnvironment,
  existing: EnvironmentResponse,
): boolean => {
  if (existing.name !== env.name) {
    return true;
  }
  const existingRgs = [...(existing.resourceGroups ?? [])].sort();
  const desiredRgs = [...env.resourceGroups].sort();
  if (stableStringify(existingRgs) !== stableStringify(desiredRgs)) {
    return true;
  }
  // Compare only the parameter keys the SDK manages; the server may add its own
  // (e.g. status/output fields) which must not count as drift.
  const existingParams = (existing.parameters ?? {}) as Record<string, unknown>;
  const managedSubset: Record<string, unknown> = {};
  for (const key of Object.keys(env.parameters)) {
    managedSubset[key] = existingParams[key];
  }
  return stableStringify(managedSubset) !== stableStringify(env.parameters);
};

const createOrUpdateEnvironment = async (
  env: ResolvedEnvironment,
  isManagement: boolean,
  creds: Credentials,
  quiet: boolean,
): Promise<EnvironmentResponse | null> => {
  const id = formatEnvironmentId(env.id);
  const existing = await fetchEnvironment(env, creds);
  if (existing === null || existing.status.toLowerCase() === 'deleted') {
    log(quiet, 'INFO', 'Creating environment', {env: id});
    await createEnvironment(env, isManagement, creds);
    return null;
  }
  if (needsUpdate(env, existing)) {
    log(quiet, 'INFO', 'Updating environment', {env: id});
    // Preserve the existing default CI/CD profile; profiles are managed later.
    await updateEnvironment(
      env,
      creds,
      existing.defaultCiCdProfileShortName ?? null,
    );
  } else {
    log(quiet, 'INFO', 'Environment up-to-date', {env: id});
  }
  return existing;
};

// ── public API ───────────────────────────────────────────────────────────────
/**
 * Deploy a management environment tree: create/update the management env and each
 * operational env, push secrets + CI/CD profiles, then initialize cloud agents.
 * Management runs first (operational agents inherit its identity).
 */
export async function deployEnvironment(
  management: ManagementEnvironmentNode,
  creds: Credentials,
  opts: DeployEnvironmentOptions = {},
): Promise<void> {
  const tree = resolveEnvironment(management);
  const quiet = opts.quiet ?? false;
  const agentInit = opts.agentInit ?? 'fire-and-forget';
  const pollIntervalMs = opts.pollIntervalMs ?? DEFAULT_AGENT_POLL_INTERVAL_MS;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_AGENT_TIMEOUT_MS;

  const ordered: {env: ResolvedEnvironment; isManagement: boolean}[] = [
    {env: tree.management, isManagement: true},
    ...tree.operationals.map(env => ({env, isManagement: false})),
  ];

  // 1. create/update every environment
  const existingById = new Map<string, EnvironmentResponse | null>();
  for (const {env, isManagement} of ordered) {
    existingById.set(
      formatEnvironmentId(env.id),
      await createOrUpdateEnvironment(env, isManagement, creds, quiet),
    );
  }

  // 2. secrets
  for (const {env} of ordered) {
    await manageSecrets(env, creds);
  }

  // 3. CI/CD profiles (+ default)
  for (const {env} of ordered) {
    const existing = existingById.get(formatEnvironmentId(env.id)) ?? null;
    await manageCiCdProfiles(
      env,
      creds,
      existing?.defaultCiCdProfileShortName ?? null,
    );
  }

  // 4. cloud-agent initialization
  const agentOpts = {
    agentInit,
    pollIntervalMs,
    timeoutMs,
    quiet,
    providerCredentials: opts.providerCredentials,
  };
  for (const {env} of ordered) {
    for (const agent of env.cloudAgents) {
      await initializeAgent(env, agent, creds, agentOpts);
    }
  }
}
