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
import {collectSecrets, send} from '../api-error';
import {
  apiUrl,
  authHeaders,
  sleep,
  elapsedSec,
  log,
  type ApiConfig,
  type LabeledSecret,
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

const environmentsUrl = (cfg: ApiConfig): string =>
  apiUrl(cfg, '/environments');
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

/**
 * The management-environment reference to submit for an environment.
 *
 * A management environment has no management environment of its own, and the API
 * rejects a body that names an environment as its own management environment
 * (reasonCode=SelfReferentialManagementEnvironment). Derived from the resolved
 * environment rather than passed in, so every request body that carries the field
 * — create, update, and the CI/CD-profile default update — is self-reference safe
 * by construction. Passing it explicitly is what let update-of-management ship
 * broken: creating a management env worked, updating one always failed, so a
 * management env deployed once and then failed on every re-run.
 */
const managementIdDto = (env: ResolvedEnvironment): EnvironmentIdDto | null =>
  formatEnvironmentId(env.id) === formatEnvironmentId(env.managementId)
    ? null
    : idDto(env.managementId);

const envUri = (
  cfg: ApiConfig,
  env: ResolvedEnvironment,
  path = '',
): string => {
  const base = `${environmentsUrl(cfg)}/${formatEnvironmentId(env.id)}`;
  return path ? `${base}/${path}` : base;
};

// ── low-level HTTP ─────────────────────────────────────────────────────────────
const fetchEnvironment = async (
  env: ResolvedEnvironment,
  cfg: ApiConfig,
): Promise<EnvironmentResponse | null> => {
  const res = await send(
    cfg,
    superagent
      .get(envUri(cfg, env))
      .ok(r => r.status === 200 || r.status === 404)
      .set(authHeaders(cfg)),
  );
  return res.status === 200 ? (res.body as EnvironmentResponse) : null;
};

const createEnvironment = async (
  env: ResolvedEnvironment,
  cfg: ApiConfig,
): Promise<void> => {
  await send(
    cfg,
    superagent
      .post(envUri(cfg, env))
      .ok(r => r.status === 201)
      .set(authHeaders(cfg))
      .send({
        managementEnvironmentId: managementIdDto(env),
        name: env.name,
        resourceGroups: env.resourceGroups,
        parameters: env.parameters,
      }),
  );
};

const updateEnvironment = async (
  env: ResolvedEnvironment,
  cfg: ApiConfig,
  defaultCiCdProfileShortName: string | null,
): Promise<void> => {
  await send(
    cfg,
    superagent
      .put(envUri(cfg, env))
      .ok(r => r.status === 200)
      .set(authHeaders(cfg))
      .send({
        managementEnvironmentId: managementIdDto(env),
        name: env.name,
        resourceGroups: env.resourceGroups,
        parameters: env.parameters,
        defaultCiCdProfileShortName,
      }),
  );
};

const manageSecrets = async (
  env: ResolvedEnvironment,
  cfg: ApiConfig,
): Promise<void> => {
  if (env.secrets.length === 0) {
    return;
  }
  await send(
    cfg,
    superagent
      .post(envUri(cfg, env, 'secrets/bulk'))
      .ok(r => r.status === 201 || r.status === 404)
      .set(authHeaders(cfg))
      .send(env.secrets as Secret[]),
    // This request body IS the customer's secret values. Dropping the request
    // object covers the request itself; these entries cover a server that quotes
    // an offending value back in its error body.
    (env.secrets as Secret[]).map(s => ({
      label: `secret:${s.shortName}`,
      value: s.value,
    })),
  );
};

const manageCiCdProfiles = async (
  env: ResolvedEnvironment,
  cfg: ApiConfig,
  currentDefault: string | null,
): Promise<void> => {
  if (env.defaultCiCdProfile === undefined) {
    // Clear an existing default if one was set previously.
    if (
      currentDefault !== null &&
      currentDefault !== undefined &&
      currentDefault !== ''
    ) {
      await updateEnvironment(env, cfg, null);
    }
    return;
  }
  const profiles: CiCdProfile[] = [env.defaultCiCdProfile, ...env.ciCdProfiles];
  await send(
    cfg,
    superagent
      .post(envUri(cfg, env, 'ci-cd-profiles/bulk'))
      .ok(r => r.status === 201 || r.status === 404)
      .set(authHeaders(cfg))
      .send(profiles),
    // SSH private keys and their passphrases. A PEM key contains newlines, which
    // is exactly the shape that defeated one-level escape matching in the samples
    // repo — hence the fixed-point spellings in api-error.ts.
    profiles.flatMap(p => [
      {label: `ciCdProfile:${p.shortName}`, value: p.sshPrivateKeyData},
      ...(p.sshPrivateKeyPassphrase === undefined
        ? []
        : [
            {
              label: `ciCdProfilePassphrase:${p.shortName}`,
              value: p.sshPrivateKeyPassphrase,
            },
          ]),
    ]),
  );
  if (env.defaultCiCdProfile.shortName !== currentDefault) {
    await updateEnvironment(env, cfg, env.defaultCiCdProfile.shortName);
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

/** Thrown when a provider's credentials carry both a static secret and a
 *  federated (OIDC) token — the intent is ambiguous, so refuse rather than
 *  silently pick one (and risk sending a secret the caller meant to suppress). */
const mixedCreds = (provider: string): Error =>
  new Error(
    `Cloud-agent initialization for ${provider} received both static and federated ` +
      `credentials in providerCredentials.${provider.toLowerCase()}; supply exactly one.`,
  );

/** True when `o` has a non-empty string value at `key`. Used to detect the
 *  static-vs-federated variant (and mixed-credential misuse) at runtime. */
const hasKey = (o: object, key: string): boolean => {
  const v = (o as Record<string, unknown>)[key];
  return typeof v === 'string' && v.length > 0;
};

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
      if (hasKey(c, 'accessKeyId') && hasKey(c, 'webIdentityToken')) {
        throw mixedCreds('AWS');
      }
      // TODO: AWS federated (web-identity) init pending server support
      if (hasKey(c, 'webIdentityToken')) {
        const oidc = c as {roleArn: string; webIdentityToken: string};
        return {
          'X-AWS-Role-Arn': oidc.roleArn,
          'X-AWS-Web-Identity-Token': oidc.webIdentityToken,
        };
      }
      const sc = c as {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken?: string;
      };
      const headers: Record<string, string> = {
        'X-AWS-Access-Key-ID': sc.accessKeyId,
        'X-AWS-Secret-Access-Key': sc.secretAccessKey,
      };
      if (sc.sessionToken) {
        headers['X-AWS-Session-Token'] = sc.sessionToken;
      }
      return headers;
    }
    case 'AZURE': {
      const c = pc?.azure;
      if (!c) {
        throw missingCreds('AZURE');
      }
      if (hasKey(c, 'spClientSecret') && hasKey(c, 'federatedToken')) {
        throw mixedCreds('AZURE');
      }
      // Workload-identity federation: forward the caller-minted token as the
      // client assertion; the client id is the (public) app-registration id.
      if (hasKey(c, 'federatedToken')) {
        const oidc = c as {clientId: string; federatedToken: string};
        return {
          'X-Azure-SP-Client-ID': oidc.clientId,
          'X-Azure-Client-Assertion': oidc.federatedToken,
        };
      }
      const sp = c as {spClientId: string; spClientSecret: string};
      return {
        'X-Azure-SP-Client-ID': sp.spClientId,
        'X-Azure-SP-Client-Secret': sp.spClientSecret,
      };
    }
    case 'GCP': {
      const c = pc?.gcp;
      if (!c) {
        throw missingCreds('GCP');
      }
      if (
        hasKey(c, 'serviceAccountCredentials') &&
        hasKey(c, 'federatedToken')
      ) {
        throw mixedCreds('GCP');
      }
      // TODO: GCP workload-identity-federation init pending server support
      if (hasKey(c, 'federatedToken')) {
        const oidc = c as {
          serviceAccountEmail: string;
          workloadIdentityProvider: string;
          federatedToken: string;
        };
        return {
          'X-GCP-Service-Account-Email': oidc.serviceAccountEmail,
          'X-GCP-Workload-Identity-Provider': oidc.workloadIdentityProvider,
          'X-GCP-Federated-Token': oidc.federatedToken,
        };
      }
      const sc = c as {
        serviceAccountEmail: string;
        serviceAccountCredentials: string;
      };
      return {
        'X-GCP-Service-Account-Email': sc.serviceAccountEmail,
        'X-GCP-Service-Account-Credentials': sc.serviceAccountCredentials,
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
  cfg: ApiConfig,
): Promise<InitializationRun | null> => {
  const res = await send(
    cfg,
    superagent
      .get(envUri(cfg, env, `initializer/${providerPath[provider]}/status`))
      .ok(r => r.status === 200 || r.status === 404)
      .set(authHeaders(cfg)),
  );
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
  cfg: ApiConfig,
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
  const current = await fetchInitializationStatus(env, provider, cfg);
  const needsStart =
    current === null ||
    current.status === 'Failed' ||
    current.status === 'Cancelled';

  if (needsStart) {
    log(opts.quiet, 'INFO', 'Starting cloud-agent initialization', {
      env: envId,
      provider,
    });
    // This request carries the PROVIDER's credentials as headers (`initHeaders`):
    // an Azure SP secret, a GCP service-account JSON key, AWS keys. Two distinct
    // exposures, and they need two distinct answers:
    //   - the REQUEST object holding the raw header block — covered structurally,
    //     because `send` drops it;
    //   - the RESPONSE body, which this endpoint of all endpoints may quote the
    //     offending credential back in, since validating it is its job. That needs
    //     the values in the redaction set, which is what `secretsFromHeaders`
    //     supplies. Header names carrying identifiers (role ARN, client id,
    //     service-account email) are deliberately excluded so they still show up in
    //     a diagnostic.
    const providerHeaders = initHeaders(agent, opts.providerCredentials);
    await send(
      cfg,
      superagent
        .post(
          envUri(cfg, env, `initializer/${providerPath[provider]}/initialize`),
        )
        .ok(r => r.status === 202)
        .set(authHeaders(cfg))
        .set(providerHeaders)
        .send(initBody(agent, env)),
      collectSecrets(providerHeaders),
    );
  }

  if (opts.agentInit === 'fire-and-forget') {
    return;
  }

  const startMs = Date.now();
  const deadline = startMs + opts.timeoutMs;
  let round = 0;
  while (Date.now() < deadline) {
    round++;
    const run = await fetchInitializationStatus(env, provider, cfg);
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
  cfg: ApiConfig,
  quiet: boolean,
): Promise<EnvironmentResponse | null> => {
  const id = formatEnvironmentId(env.id);
  const existing = await fetchEnvironment(env, cfg);
  if (existing === null || existing.status.toLowerCase() === 'deleted') {
    log(quiet, 'INFO', 'Creating environment', {env: id});
    await createEnvironment(env, cfg);
    return null;
  }
  if (needsUpdate(env, existing)) {
    log(quiet, 'INFO', 'Updating environment', {env: id});
    // Preserve the existing default CI/CD profile; profiles are managed later.
    await updateEnvironment(
      env,
      cfg,
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
  cfg: ApiConfig,
  opts: DeployEnvironmentOptions = {},
): Promise<void> {
  const tree = resolveEnvironment(management);
  const quiet = opts.quiet ?? false;
  const agentInit = opts.agentInit ?? 'fire-and-forget';
  const pollIntervalMs = opts.pollIntervalMs ?? DEFAULT_AGENT_POLL_INTERVAL_MS;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_AGENT_TIMEOUT_MS;

  // Management first: operational agents inherit its identity.
  const ordered: ResolvedEnvironment[] = [
    tree.management,
    ...tree.operationals,
  ];

  // Every secret THIS deployment sends, collected once and attached to the config
  // so it covers every request the deployment makes — not only the request that
  // carried each value.
  //
  // Scoping it per call site was measurably not enough: a server can quote a
  // provider credential back from a LATER call that never sent it. Probing this
  // flow against a listener that echoed an Azure SP secret, the leak surfaced on
  // the initialization-STATUS poll — a plausible place for a real control plane to
  // report "the credentials you provided are invalid: <value>".
  const deploymentSecrets: LabeledSecret[] = [
    ...collectSecrets(opts.providerCredentials, 'providerCredentials'),
    ...ordered.flatMap(env => [
      ...env.secrets.map(s => ({
        label: `secret:${s.shortName}`,
        value: s.value,
      })),
      ...[
        ...(env.defaultCiCdProfile ? [env.defaultCiCdProfile] : []),
        ...env.ciCdProfiles,
      ].flatMap(p => [
        {label: `ciCdProfile:${p.shortName}`, value: p.sshPrivateKeyData},
        ...(p.sshPrivateKeyPassphrase === undefined
          ? []
          : [
              {
                label: `ciCdPassphrase:${p.shortName}`,
                value: p.sshPrivateKeyPassphrase,
              },
            ]),
      ]),
    ]),
  ];
  const scopedCfg: ApiConfig = {...cfg, extraSecrets: deploymentSecrets};

  // 1. create/update every environment
  const existingById = new Map<string, EnvironmentResponse | null>();
  for (const env of ordered) {
    existingById.set(
      formatEnvironmentId(env.id),
      await createOrUpdateEnvironment(env, scopedCfg, quiet),
    );
  }

  // 2. secrets
  for (const env of ordered) {
    await manageSecrets(env, scopedCfg);
  }

  // 3. CI/CD profiles (+ default)
  for (const env of ordered) {
    const existing = existingById.get(formatEnvironmentId(env.id)) ?? null;
    await manageCiCdProfiles(
      env,
      scopedCfg,
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
  for (const env of ordered) {
    for (const agent of env.cloudAgents) {
      await initializeAgent(env, agent, scopedCfg, agentOpts);
    }
  }
}
