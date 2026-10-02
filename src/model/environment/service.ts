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
 *   GET           /{type}/{ownerId}                (list, summaries)
 *   GET|POST|PUT  /{type}/{ownerId}/{shortName}
 *   POST          /{...}/secrets/bulk
 *   POST          /{...}/ci-cd-profiles/bulk
 *   POST          /{...}/initializer/{provider}/initialize
 *   GET           /{...}/initializer/{provider}/status
 *   GET           /{...}/dns-zones                 (DNS zone results)
 *
 * NOT runtime-verified here (no Fractal Cloud credentials) — covered by mocked
 * HTTP unit tests; smoke against the live API before release.
 */
import superagent from 'superagent';
import {collectSecrets, redactSecrets, send} from '../api-error';
import {
  apiUrl,
  authHeaders,
  sleep,
  elapsedSec,
  log,
  pathSegment,
  type ApiConfig,
  type LabeledSecret,
} from '../http';
import type {
  CiCdProfile,
  EnvironmentDetails,
  EnvironmentId,
  EnvironmentSummary,
  EnvironmentType,
  ProviderCredentials,
  ProviderCredentialsResolver,
  Secret,
} from './types';
import {formatEnvironmentId, NETWORK_TIER_PARAMETER} from './types';
import type {DnsZoneProvider} from './dns_zone_provider';
import type {DnsZoneProviderResult} from './dns_zone_provider_result';
import type {EnvironmentDnsZone} from './environment_dns_zone';
import type {EnvironmentDnsZones} from './environment_dns_zones';
import {findParameter} from './parameters';
import {keepStoredAgentOrder} from './agent_order';
import {ProviderCredentialsNotConfigured} from './provider_credentials_not_configured';
import type {DeployedAgent} from './deployed_agent';
import type {EnvironmentDeployResult} from './environment_deploy_result';
import type {SkippedAgent} from './skipped_agent';
import type {CiReporter} from '../ci/ci_reporter';
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
  /**
   * Credentials for the cloud agents you initialize (throws if a needed
   * provider's credentials are absent).
   *
   * - An OBJECT is used for every environment in the tree — the management env
   *   and each operational env alike. Fine when they share one account.
   * - A FUNCTION ({@link ProviderCredentialsResolver}) is asked per environment
   *   and agent, right before that agent's `initialize` request, and only when one
   *   is actually sent. Use it when the environments live in different cloud
   *   accounts — e.g. key on `request.environment.shortName` or
   *   `request.accountId`.
   *
   * AWS: only three-part session credentials (`accessKeyId` + `secretAccessKey`
   * + `sessionToken`) are honored by the control plane today; see
   * {@link AwsCredentials}.
   *
   * A resolver that throws {@link ProviderCredentialsNotConfigured} declares that
   * this run holds no credentials for that cloud: the agent is skipped with a
   * notice and the deploy goes on with the others, so one CI job per cloud can
   * each deploy the whole tree (see `credentialsFromCi`). Any other error, or a
   * resolver returning nothing, fails the deploy.
   */
  providerCredentials?: ProviderCredentials | ProviderCredentialsResolver;
  /**
   * `wait` polls each cloud-agent initialization to completion; `fire-and-forget`
   * starts them and returns. Default `fire-and-forget`.
   *
   * Environments are initialized in order: the management env first, then each
   * operational env. The control plane refuses an operational initialization
   * until the management env's initialization for that provider has Completed, so
   * initializing a NEW tree (management + operational agents) in one run needs
   * `wait`. Under `fire-and-forget` the deploy starts the management
   * initialization and then throws before any operational one, naming this
   * option; re-running once the management env is initialized proceeds.
   */
  agentInit?: 'wait' | 'fire-and-forget';
  /**
   * An operational agent whose management agent on the same cloud has not
   * completed (so the control plane would refuse it): `skip` (default) leaves it
   * for a later deploy with a notice; `fail` throws before sending anything.
   * The operational environment itself is still created or updated.
   */
  pendingManagement?: 'skip' | 'fail';
  /**
   * Where notices about skipped agents go (a CI reporter, e.g. `ci.reporter`
   * from `detectCi()`). Default: the deploy's own log lines.
   */
  reporter?: CiReporter;
  /**
   * Send `POST .../initialize` even when a stored initialization run already
   * reads `Completed`. Default `false` — every existing caller keeps today's
   * behavior exactly.
   *
   * A stored `Completed` run is evidence that an initialization once finished,
   * NOT evidence that the agent is still alive. When the management plane is
   * destroyed out of band (a cleanup job deleting the agent's resource groups),
   * the run stays `Completed` forever, no initialize is ever sent again, and the
   * environment is deadlocked while every deploy reports success. There is no
   * agent-liveness endpoint to consult, so the decision belongs to the caller:
   * a harness that knows its plane is disposable sets this, a caller deploying
   * into a long-lived environment does not.
   */
  reinitializeAgents?: boolean;
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

/** Case-insensitive key match: the control plane looks parameters up
 *  case-insensitively (`networkTier` and `NetworkTier` are the same key). */
const sameKey = (a: string, b: string): boolean =>
  a.toLowerCase() === b.toLowerCase();

/**
 * The parameters to submit when UPDATING an environment.
 *
 * The API's PUT replaces `parameters` wholesale, so sending only what the SDK
 * declares would wipe every key it does not know about — a `networkTier` set in
 * the web UI, the `agents` the server records at initialization. Start from the
 * server's current parameters and overlay only the declared keys: a declared
 * value replaces the server's (including any differently-cased spelling of the
 * same key), a declared `null` removes it, and every undeclared key — including
 * one whose declared value is `undefined` — is kept byte-for-byte.
 */
export const mergeEnvironmentParameters = (
  current: Readonly<Record<string, unknown>> | null | undefined,
  declared: Readonly<Record<string, unknown>>,
): Record<string, unknown> => {
  const merged: Record<string, unknown> = {};
  // `undefined` is NOT a declaration — only `null` declares a key absent — so a
  // key whose value is `undefined` neither replaces nor removes anything.
  const declaredKeys = Object.keys(declared).filter(
    k => declared[k] !== undefined,
  );
  for (const [key, value] of Object.entries(current ?? {})) {
    if (!declaredKeys.some(d => sameKey(d, key))) {
      merged[key] = value;
    }
  }
  for (const key of declaredKeys) {
    if (declared[key] !== null) {
      merged[key] = declared[key];
    }
  }
  return merged;
};

/** Declared parameters for a CREATE: there is nothing to preserve, and a key
 *  declared absent (`null`) is simply not sent. */
const createParameters = (
  declared: Readonly<Record<string, unknown>>,
): Record<string, unknown> => mergeEnvironmentParameters({}, declared);

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
        parameters: createParameters(env.parameters),
      }),
  );
};

/**
 * PUT an environment. `parameters` is the FULL set to store — the API replaces
 * the field wholesale — so callers pass the merged set
 * ({@link mergeEnvironmentParameters}), never `env.parameters` alone.
 */
const updateEnvironment = async (
  env: ResolvedEnvironment,
  cfg: ApiConfig,
  parameters: Record<string, unknown>,
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
        parameters,
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
  parameters: Record<string, unknown>,
): Promise<void> => {
  if (env.defaultCiCdProfile === undefined) {
    // Clear an existing default if one was set previously.
    if (
      currentDefault !== null &&
      currentDefault !== undefined &&
      currentDefault !== ''
    ) {
      await updateEnvironment(env, cfg, parameters, null);
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
    await updateEnvironment(
      env,
      cfg,
      parameters,
      env.defaultCiCdProfile.shortName,
    );
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

/**
 * Refuse AWS static credentials that are not all three of `accessKeyId`,
 * `secretAccessKey` and `sessionToken`. The control plane uses them as inline
 * credentials only when all three are present and otherwise silently falls back
 * to whatever credential it already holds — so a partial set would "work" against
 * a different identity than the one supplied. Web-identity credentials are a
 * separate variant and are not checked here. Returns the problem, or `null`.
 */
const partialAwsCredentials = (
  pc: ProviderCredentials | undefined,
): string | null => {
  const c = pc?.aws as Record<string, unknown> | undefined;
  // Exempt only the complete web-identity variant: a lone `roleArn` (or one
  // mixed with partial keys) would otherwise slip partial keys through.
  if (!c || (hasKey(c, 'webIdentityToken') && hasKey(c, 'roleArn'))) {
    return null;
  }
  const parts = ['accessKeyId', 'secretAccessKey', 'sessionToken'];
  const missing = parts.filter(k => !hasKey(c, k));
  return missing.length === 0
    ? null
    : 'AWS credentials must carry all of accessKeyId, secretAccessKey and sessionToken ' +
        `(the control plane ignores a partial set); missing: ${missing.join(', ')}.`;
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
      // The server's AWS initializer binds only the three X-AWS-Access-Key-ID /
      // -Secret-Access-Key / -Session-Token headers today, so these two are sent
      // but ignored — see AwsCredentials, and the WARN logged by awsCredsWarning.
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

/**
 * A warning for AWS credentials the control plane will not use as inline
 * credentials (see {@link AwsCredentials}), or `null` when they are honored.
 * Logged rather than thrown: the server may still succeed with a credential it
 * already holds for the environment, which is a legitimate setup.
 */
const awsCredsWarning = (
  pc: ProviderCredentials | undefined,
): string | null => {
  const c = pc?.aws;
  if (!c) {
    return null;
  }
  if (hasKey(c, 'webIdentityToken')) {
    return (
      'AWS web-identity credentials (roleArn + webIdentityToken) are not honored by the ' +
      'control plane yet; exchange the token with sts:AssumeRoleWithWebIdentity and pass ' +
      'accessKeyId + secretAccessKey + sessionToken instead'
    );
  }
  // A partial static set never gets here: partialAwsCredentials refuses it.
  return null;
};

/** The cloud account an agent lands in, provider-neutrally. */
const agentAccountId = (agent: CloudAgent): string => {
  switch (agent.provider) {
    case 'AWS':
      return agent.accountId;
    case 'AZURE':
      return agent.subscriptionId;
    case 'GCP':
    case 'HETZNER':
      return agent.projectId;
    case 'OCI':
      return agent.compartmentId;
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

/** What a deploy knows about an agent's initialization once it has handled it:
 *  `Completed` only when a Completed run was observed (and not forced over);
 *  `Held` when it was held back before asking for credentials, `NoCredentials`
 *  when this run holds none for its cloud. */
type AgentInitOutcome = 'Completed' | 'NotCompleted' | 'Held' | 'NoCredentials';

const initializeAgent = async (
  env: ResolvedEnvironment,
  agent: CloudAgent,
  cfg: ApiConfig,
  opts: {
    agentInit: 'wait' | 'fire-and-forget';
    reinitializeAgents: boolean;
    pollIntervalMs: number;
    timeoutMs: number;
    quiet: boolean;
    /** Resolves this env's credentials; called only when initialize is sent.
     *  `null`: this run holds none for the agent's cloud, and it is skipped. */
    credentialsFor: (
      env: ResolvedEnvironment,
      agent: CloudAgent,
    ) => Promise<ProviderCredentials | undefined | null>;
    /** Told once the initialize request has been accepted. */
    onStarted: (agent: CloudAgent) => void;
    /** `false` (or a throw) when this agent may not be initialized yet. */
    beforeStart: (env: ResolvedEnvironment, agent: CloudAgent) => boolean;
  },
): Promise<AgentInitOutcome> => {
  const envId = formatEnvironmentId(env.id);
  const provider = agent.provider;

  // (Re)start only if there is no current run or the last one failed/cancelled —
  // unless the caller demanded a re-initialization, which overrides the stored
  // status entirely (`reinitializeAgents`; a `Completed` run does not prove the
  // agent still exists).
  const current = await fetchInitializationStatus(env, provider, cfg);
  const needsStart =
    opts.reinitializeAgents ||
    current === null ||
    current.status === 'Failed' ||
    current.status === 'Cancelled';

  // A forced start over an existing run has a second short-circuit to clear: the
  // status endpoint keeps serving that OLD run until the server picks the new one
  // up, so the poll loop below would read the pre-existing terminal status and
  // return success without anything having happened. Remember the run we forced
  // over and refuse to accept a verdict from it; the first status that differs
  // releases the guard.
  const forcedOver =
    opts.reinitializeAgents && current !== null
      ? stableStringify(current)
      : null;

  if (needsStart) {
    if (!opts.beforeStart(env, agent)) {
      return 'Held';
    }
    log(opts.quiet, 'INFO', 'Starting cloud-agent initialization', {
      env: envId,
      provider,
      // Only when forced: an unset `reinitializeAgents` must not change a single
      // byte of what existing callers see.
      ...(opts.reinitializeAgents ? {forced: 'true'} : {}),
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
    const credentials = await opts.credentialsFor(env, agent);
    if (credentials === null) {
      return 'NoCredentials';
    }
    const warning =
      agent.provider === 'AWS' ? awsCredsWarning(credentials) : null;
    if (warning !== null) {
      log(opts.quiet, 'WARN', warning, {env: envId, provider});
    }
    const providerHeaders = initHeaders(agent, credentials);
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
    opts.onStarted(agent);
  }

  if (opts.agentInit === 'fire-and-forget') {
    return !needsStart && current?.status === 'Completed'
      ? 'Completed'
      : 'NotCompleted';
  }

  const startMs = Date.now();
  const deadline = startMs + opts.timeoutMs;
  let round = 0;
  let staleRun = forcedOver;
  while (Date.now() < deadline) {
    round++;
    const run = await fetchInitializationStatus(env, provider, cfg);
    if (
      run !== null &&
      staleRun !== null &&
      stableStringify(run) === staleRun
    ) {
      log(
        opts.quiet,
        'CHECK',
        'Waiting for the forced cloud-agent re-initialization to be picked up',
        {
          env: envId,
          provider,
          round,
          status: run.status,
          elapsed: elapsedSec(startMs),
        },
      );
      await sleep(opts.pollIntervalMs);
      continue;
    }
    staleRun = null;
    if (run !== null) {
      logSteps(opts.quiet, envId, provider, run);
      switch (run.status) {
        case 'Completed':
          log(opts.quiet, 'INFO', 'Cloud-agent initialization completed', {
            env: envId,
            provider,
            elapsed: elapsedSec(startMs),
          });
          return 'Completed';
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
  parameters: Record<string, unknown>,
): boolean => {
  if (existing.name !== env.name) {
    return true;
  }
  const existingRgs = [...(existing.resourceGroups ?? [])].sort();
  const desiredRgs = [...env.resourceGroups].sort();
  if (stableStringify(existingRgs) !== stableStringify(desiredRgs)) {
    return true;
  }
  // Drift is "applying the declared keys would change the stored parameters".
  // Keys the SDK does not declare are preserved by the merge, so a key the server
  // or the web UI added never counts as drift.
  const existingParams = (existing.parameters ?? {}) as Record<string, unknown>;
  return stableStringify(parameters) !== stableStringify(existingParams);
};

/** Result of reconciling one environment's own record. `parameters` is what
 *  the server now holds (as far as this deploy knows), the base for any later
 *  PUT in the same deploy. */
type EnvironmentWriteResult = {
  existing: EnvironmentResponse | null;
  parameters: Record<string, unknown>;
};

const createOrUpdateEnvironment = async (
  env: ResolvedEnvironment,
  cfg: ApiConfig,
  quiet: boolean,
  /** The record already read for this env, when a pre-pass fetched it. */
  prefetched?: EnvironmentResponse | null,
): Promise<EnvironmentWriteResult> => {
  const id = formatEnvironmentId(env.id);
  const existing =
    prefetched === undefined ? await fetchEnvironment(env, cfg) : prefetched;
  if (existing === null || existing.status.toLowerCase() === 'deleted') {
    log(quiet, 'INFO', 'Creating environment', {env: id});
    await createEnvironment(env, cfg);
    return {existing: null, parameters: createParameters(env.parameters)};
  }
  // Agents the tree declares in another order than the server stores them are
  // the same agents: keep the stored order, so nothing is rewritten for it and
  // the order never flips between runs.
  const parameters = keepStoredAgentOrder(
    existing.parameters ?? {},
    mergeEnvironmentParameters(existing.parameters, env.parameters),
  );
  // Removing the last tag / DNS zone from code no longer clears it (undeclared
  // keys are preserved), so say which builder-owned keys were kept — a quiet
  // change in convergence is worse than a noisy one.
  const kept = ['tags', 'dnsZones'].filter(
    k =>
      findParameter(env.parameters, k) === undefined &&
      findParameter(existing.parameters, k) !== undefined,
  );
  if (kept.length > 0) {
    log(quiet, 'INFO', 'Keeping stored parameters this tree does not declare', {
      env: id,
      keys: kept.join(','),
      clearWith: "withParameter('<key>', null)",
    });
  }
  if (needsUpdate(env, existing, parameters)) {
    log(quiet, 'INFO', 'Updating environment', {env: id});
    // Preserve the existing default CI/CD profile; profiles are managed later.
    await updateEnvironment(
      env,
      cfg,
      parameters,
      existing.defaultCiCdProfileShortName ?? null,
    );
  } else {
    log(quiet, 'INFO', 'Environment up-to-date', {env: id});
  }
  return {existing, parameters};
};

/**
 * Refuse an operational `networkTier` the control plane would ignore because the
 * management environment STORES a different one (set in the web UI, or by an
 * earlier deploy) without this tree declaring it. Resolution already refuses the
 * case where both are declared; this covers the stored half, which is only
 * knowable once the management env has been read. Runs for every operational env
 * right after that read and before ANY environment is written, so a refused tree
 * leaves the control plane untouched.
 */
const assertTierApplies = (
  env: ResolvedEnvironment,
  management: ResolvedEnvironment,
  managementParameters: Readonly<Record<string, unknown>>,
): void => {
  const mgmtId = formatEnvironmentId(management.id);
  if (formatEnvironmentId(env.id) === mgmtId) {
    return;
  }
  const opTier = findParameter(env.parameters, NETWORK_TIER_PARAMETER);
  const stored = managementParameters;
  const mgmtTier = findParameter(stored, NETWORK_TIER_PARAMETER);
  if (
    opTier === undefined ||
    opTier === null ||
    mgmtTier === undefined ||
    mgmtTier === null ||
    // The server treats a blank tier as unset (IsNullOrWhiteSpace) and falls
    // back to the operational value, so a blank one overrides nothing.
    String(mgmtTier).trim().length === 0 ||
    String(mgmtTier).trim().toLowerCase() === String(opTier).toLowerCase()
  ) {
    return;
  }
  throw new Error(
    `Operational environment '${formatEnvironmentId(env.id)}': networkTier '${String(opTier)}' ` +
      `would be ignored — management environment '${mgmtId}' stores networkTier ` +
      `'${String(mgmtTier)}', which the control plane reads first. Declare ` +
      "withParameter('networkTier', null) on the management environment to tier " +
      'operational environments individually, or drop the operational tier.',
  );
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
): Promise<EnvironmentDeployResult> {
  const tree = resolveEnvironment(management);
  const pendingManagement = opts.pendingManagement ?? 'skip';
  const result: EnvironmentDeployResult = {
    started: [],
    completed: [],
    inProgress: [],
    skipped: [],
  };
  const agentRef = (
    env: ResolvedEnvironment,
    agent: CloudAgent,
  ): DeployedAgent => ({environment: {...env.id}, provider: agent.provider});
  const skip = (
    env: ResolvedEnvironment,
    agent: CloudAgent,
    reason: SkippedAgent['reason'],
    text: string,
  ): void => {
    // A resolver's own message can carry anything it held: redact what this
    // deploy knows to be secret before it reaches a notice or the result.
    const message = redactSecrets(text, deploymentSecrets);
    result.skipped.push({...agentRef(env, agent), reason, message});
    if (opts.reporter !== undefined) {
      opts.reporter.notice(message);
    } else {
      log(quiet, 'WARN', message, {
        env: formatEnvironmentId(env.id),
        provider: agent.provider,
      });
    }
  };
  const quiet = opts.quiet ?? false;
  const agentInit = opts.agentInit ?? 'fire-and-forget';
  const reinitializeAgents = opts.reinitializeAgents ?? false;
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
  //
  // Mutable on purpose: credentials from a resolver function only exist once it
  // is called, mid-deployment, and are appended here before the request that
  // carries them — the config holds this same array, so every LATER request is
  // covered too.
  const staticCredentials =
    typeof opts.providerCredentials === 'function'
      ? undefined
      : opts.providerCredentials;
  // Refuse a partial AWS set before anything is written — only when the tree has
  // an AWS agent those credentials could be sent for.
  const hasAwsAgent = ordered.some(e =>
    e.cloudAgents.some(a => a.provider === 'AWS'),
  );
  const staticProblem = hasAwsAgent
    ? partialAwsCredentials(staticCredentials)
    : null;
  if (staticProblem !== null) {
    throw new Error(`providerCredentials.aws: ${staticProblem}`);
  }
  const deploymentSecrets: LabeledSecret[] = [
    ...collectSecrets(staticCredentials, 'providerCredentials'),
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

  // 1. create/update every environment. The management record is read first
  // and reused by its write, so the stored-tier check below can run before ANY
  // write without an extra request.
  const managementExisting = await fetchEnvironment(tree.management, scopedCfg);
  const managementStoredParameters =
    managementExisting === null ||
    managementExisting.status.toLowerCase() === 'deleted'
      ? createParameters(tree.management.parameters)
      : mergeEnvironmentParameters(
          managementExisting.parameters,
          tree.management.parameters,
        );
  for (const env of tree.operationals) {
    assertTierApplies(env, tree.management, managementStoredParameters);
  }
  const writtenById = new Map<string, EnvironmentWriteResult>();
  for (const env of ordered) {
    const isManagement = env === tree.management;
    writtenById.set(
      formatEnvironmentId(env.id),
      await createOrUpdateEnvironment(
        env,
        scopedCfg,
        quiet,
        isManagement ? managementExisting : undefined,
      ),
    );
  }

  // 2. secrets
  for (const env of ordered) {
    await manageSecrets(env, scopedCfg);
  }

  // 3. CI/CD profiles (+ default)
  for (const env of ordered) {
    const written = writtenById.get(formatEnvironmentId(env.id));
    await manageCiCdProfiles(
      env,
      scopedCfg,
      written?.existing?.defaultCiCdProfileShortName ?? null,
      written?.parameters ?? createParameters(env.parameters),
    );
  }

  // 4. cloud-agent initialization
  const managementEnvId = formatEnvironmentId(tree.management.id);
  const resolveCredentials = opts.providerCredentials;
  const credentialsFor = async (
    env: ResolvedEnvironment,
    agent: CloudAgent,
  ): Promise<ProviderCredentials | undefined | null> => {
    if (typeof resolveCredentials !== 'function') {
      return resolveCredentials;
    }
    const envId = formatEnvironmentId(env.id);
    let resolved: ProviderCredentials | undefined;
    try {
      resolved = await resolveCredentials({
        environment: {...env.id},
        tier: envId === managementEnvId ? 'management' : 'operational',
        provider: agent.provider,
        accountId: agentAccountId(agent),
        region: agent.region,
      });
    } catch (err) {
      if (err instanceof ProviderCredentialsNotConfigured) {
        skip(
          env,
          agent,
          'missing-credentials',
          `Skipped the ${agent.provider} agent of '${envId}': this run holds no ` +
            `${agent.provider} credentials (${err.message}). The job holding ` +
            `${agent.provider} credentials initializes it.`,
        );
        return null;
      }
      // Name the environment; the message is the caller's own error, and no
      // `cause` is attached so nothing the resolver held rides along.
      throw new Error(
        `The providerCredentials resolver failed for the ${agent.provider} agent of ` +
          `environment '${envId}': ${redactSecrets(err instanceof Error ? err.message : String(err), deploymentSecrets)}`,
      );
    }
    // Register before the request that carries them is built.
    deploymentSecrets.push(
      ...collectSecrets(resolved, `providerCredentials[${envId}]`),
    );
    const key = agent.provider.toLowerCase() as keyof ProviderCredentials;
    if (resolved === undefined || resolved === null || !resolved[key]) {
      throw new Error(
        `Cloud-agent initialization for ${agent.provider} in environment '${envId}' requires ` +
          `${key} credentials, but the providerCredentials resolver returned none for it.`,
      );
    }
    const problem =
      agent.provider === 'AWS' ? partialAwsCredentials(resolved) : null;
    if (problem !== null) {
      throw new Error(
        `The providerCredentials resolver returned unusable credentials for environment '${envId}': ${problem}`,
      );
    }
    return resolved;
  };

  // Management outcome per provider, filled as the management env's agents are
  // handled — which is always before any operational env's (`ordered`).
  const managementOutcome = new Map<CloudAgent['provider'], AgentInitOutcome>();
  const beforeStart = (
    env: ResolvedEnvironment,
    agent: CloudAgent,
  ): boolean => {
    if (formatEnvironmentId(env.id) === managementEnvId) {
      return true;
    }
    const outcome = managementOutcome.get(agent.provider);
    // This run holds no credentials for the cloud at all (it could not start the
    // management agent either): the job holding them initializes both.
    if (outcome === 'NoCredentials') {
      skip(
        env,
        agent,
        'missing-credentials',
        `Skipped the ${agent.provider} agent of '${formatEnvironmentId(env.id)}': this run holds ` +
          `no ${agent.provider} credentials for its management environment '${managementEnvId}' ` +
          `either. The job holding ${agent.provider} credentials initializes both.`,
      );
      return false;
    }
    // Hold back only what this deploy KNOWS will fail: it handled the management
    // agent for this provider and did not observe a Completed run. Anything else
    // is left to the control plane's check.
    if (outcome !== 'NotCompleted') {
      return true;
    }
    if (pendingManagement === 'skip') {
      skip(
        env,
        agent,
        'pending-management',
        `Skipped the ${agent.provider} agent of '${formatEnvironmentId(env.id)}': its management ` +
          `environment '${managementEnvId}' has not completed its ${agent.provider} ` +
          'initialization yet, which the control plane requires first. The next deploy ' +
          'after it completes initializes this one.',
      );
      return false;
    }
    // The server would reject this with ManagementEnvironmentNotInitialized; say
    // why, and what to do, before sending anything.
    throw new Error(
      `Cannot initialize the ${agent.provider} cloud agent of operational environment ` +
        `'${formatEnvironmentId(env.id)}' yet: the control plane requires the management ` +
        `environment '${managementEnvId}' to have a Completed ${agent.provider} initialization ` +
        "first, and it has not completed. Deploy with agentInit: 'wait' to initialize a new " +
        'tree in one run, or re-run once the management environment is initialized.',
    );
  };

  const started = new Set<CloudAgent>();
  const agentOpts = {
    onStarted: (agent: CloudAgent) => started.add(agent),
    agentInit,
    reinitializeAgents,
    pollIntervalMs,
    timeoutMs,
    quiet,
    credentialsFor,
    beforeStart,
  };
  for (const env of ordered) {
    const isManagement = formatEnvironmentId(env.id) === managementEnvId;
    for (const agent of env.cloudAgents) {
      const outcome = await initializeAgent(env, agent, scopedCfg, agentOpts);
      if (isManagement) {
        managementOutcome.set(agent.provider, outcome);
      }
      if (started.has(agent)) {
        result.started.push(agentRef(env, agent));
      } else if (outcome === 'Completed') {
        result.completed.push(agentRef(env, agent));
      } else if (outcome === 'NotCompleted') {
        result.inProgress.push(agentRef(env, agent));
      }
    }
  }
  return result;
}

// ── read operations ─────────────────────────────────────────────────────────
/** Raised when a read endpoint answers 200 with a body this SDK cannot map. */
const unexpected = (what: string, path: string, detail: string): Error =>
  new Error(
    `Unexpected response from ${what}: ${path} ${detail}. ` +
      'The control plane and this SDK version may disagree on the response shape.',
  );

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(x => typeof x === 'string');

/** Validate the fields both read endpoints share; returns the checked id. */
const checkEnvironmentId = (
  what: string,
  path: string,
  v: unknown,
): EnvironmentIdDto => {
  if (
    !isObject(v) ||
    typeof v.type !== 'string' ||
    typeof v.ownerId !== 'string' ||
    typeof v.shortName !== 'string'
  ) {
    throw unexpected(
      what,
      path,
      'is not an environment id {type, ownerId, shortName}',
    );
  }
  return {type: v.type, ownerId: v.ownerId, shortName: v.shortName};
};

const optionalString = (
  what: string,
  path: string,
  v: unknown,
  fallback: string,
): string => {
  if (v === undefined || v === null) {
    return fallback;
  }
  if (typeof v !== 'string') {
    throw unexpected(what, path, 'is not a string');
  }
  return v;
};

const optionalStrings = (what: string, path: string, v: unknown): string[] => {
  if (v === undefined || v === null) {
    return [];
  }
  if (!isStringArray(v)) {
    throw unexpected(what, path, 'is not an array of strings');
  }
  return [...v];
};
const toEnvironmentId = (dto: EnvironmentIdDto): EnvironmentId => ({
  type: dto.type as EnvironmentType,
  ownerId: dto.ownerId,
  shortName: dto.shortName,
});

const checkOwner = (owner: {type: EnvironmentType; ownerId: string}): void => {
  if (owner.ownerId === undefined || owner.ownerId.trim().length === 0) {
    throw new Error('Listing environments requires an ownerId.');
  }
};

/**
 * List every environment of an owner (`GET /environments/{type}/{ownerId}`).
 * Returns summaries, ordered by short name as the server orders them; an owner
 * with no environments yields `[]`.
 */
export async function listEnvironments(
  owner: {type: EnvironmentType; ownerId: string},
  cfg: ApiConfig,
): Promise<EnvironmentSummary[]> {
  checkOwner(owner);
  const res = await send(
    cfg,
    superagent
      .get(
        `${environmentsUrl(cfg)}/${pathSegment(owner.type)}/${pathSegment(owner.ownerId)}`,
      )
      .ok(r => r.status === 200)
      .set(authHeaders(cfg)),
  );
  const what = 'GET /environments/{type}/{ownerId}';
  if (!Array.isArray(res.body)) {
    throw unexpected(what, 'body', 'is not an array');
  }
  return res.body.map((r: unknown, i: number) => {
    const at = `[${i}]`;
    if (!isObject(r)) {
      throw unexpected(what, at, 'is not an object');
    }
    return {
      id: toEnvironmentId(checkEnvironmentId(what, `${at}.id`, r.id)),
      name: optionalString(what, `${at}.name`, r.name, ''),
      status: optionalString(what, `${at}.status`, r.status, 'Unknown'),
      resourceGroups: optionalStrings(
        what,
        `${at}.resourceGroups`,
        r.resourceGroups,
      ),
      initializedClouds: optionalStrings(
        what,
        `${at}.initializedClouds`,
        r.initializedClouds,
      ),
    };
  });
}

/**
 * Read one environment (`GET /environments/{type}/{ownerId}/{shortName}`),
 * including every parameter the server holds. `null` when it does not exist.
 */
export async function getEnvironment(
  id: EnvironmentId,
  cfg: ApiConfig,
): Promise<EnvironmentDetails | null> {
  checkOwner({type: id.type, ownerId: id.ownerId});
  const res = await send(
    cfg,
    superagent
      .get(
        `${environmentsUrl(cfg)}/${pathSegment(id.type)}/${pathSegment(id.ownerId)}/${pathSegment(id.shortName)}`,
      )
      .ok(r => r.status === 200 || r.status === 404)
      .set(authHeaders(cfg)),
  );
  if (res.status !== 200) {
    return null;
  }
  const what = 'GET /environments/{type}/{ownerId}/{shortName}';
  const body: unknown = res.body;
  if (!isObject(body)) {
    throw unexpected(what, 'body', 'is not an object');
  }
  if (
    body.parameters !== undefined &&
    body.parameters !== null &&
    !isObject(body.parameters)
  ) {
    throw unexpected(what, 'parameters', 'is not an object');
  }
  const mgmt = body.managementEnvironmentId;
  return {
    id: toEnvironmentId(checkEnvironmentId(what, 'id', body.id)),
    managementEnvironmentId:
      mgmt === undefined || mgmt === null
        ? null
        : toEnvironmentId(
            checkEnvironmentId(what, 'managementEnvironmentId', mgmt),
          ),
    name: optionalString(what, 'name', body.name, ''),
    status: optionalString(what, 'status', body.status, 'Unknown'),
    resourceGroups: optionalStrings(
      what,
      'resourceGroups',
      body.resourceGroups,
    ),
    parameters: {...((body.parameters as Record<string, unknown>) ?? {})},
    defaultCiCdProfileShortName:
      body.defaultCiCdProfileShortName === undefined ||
      body.defaultCiCdProfileShortName === null
        ? null
        : optionalString(
            what,
            'defaultCiCdProfileShortName',
            body.defaultCiCdProfileShortName,
            '',
          ),
  };
}

// ── DNS zones ───────────────────────────────────────────────────────────────
const DNS_ZONES = 'GET /environments/{type}/{ownerId}/{shortName}/dns-zones';

/** The control plane spells providers `Aws` / `Gcp` / `Azure`. */
const DNS_PROVIDERS: Record<string, DnsZoneProvider> = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
};

const dnsProvider = (raw: string): DnsZoneProvider =>
  DNS_PROVIDERS[raw.toLowerCase()] ?? raw;

// The environment service's route constraints: an id outside them is answered
// 404, which would otherwise read as "no such environment".
const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SHORT_NAME_LENGTH = 30;

const requiredString = (path: string, v: unknown): string => {
  if (typeof v !== 'string' || v.length === 0) {
    throw unexpected(DNS_ZONES, path, 'is not a string');
  }
  return v;
};

const isDsRecord = (
  v: unknown,
): v is DnsZoneProviderResult['dsRecords'][number] =>
  isObject(v) &&
  Number.isInteger(v.keyTag) &&
  Number.isInteger(v.algorithm) &&
  Number.isInteger(v.digestType) &&
  typeof v.digest === 'string';

/**
 * An agent's outputs are an open map it writes; one malformed field must not
 * make every other zone unreadable. Each reader returns `undefined` for a value
 * it cannot use and records why through `problem`.
 */
const outputZoneId = (
  path: string,
  v: unknown,
  problem: (path: string, detail: string) => void,
): string | null => {
  if (v === undefined || v === null) {
    return null;
  }
  if (typeof v !== 'string') {
    problem(path, 'is not a string');
    return null;
  }
  return v;
};

const outputNameServers = (
  path: string,
  v: unknown,
  problem: (path: string, detail: string) => void,
): string[] => {
  if (v === undefined || v === null) {
    return [];
  }
  if (!isStringArray(v)) {
    problem(path, 'is not an array of strings');
    return [];
  }
  return [...v];
};

const outputDsRecords = (
  path: string,
  v: unknown,
  problem: (path: string, detail: string) => void,
): DnsZoneProviderResult['dsRecords'] => {
  if (v === undefined || v === null) {
    return [];
  }
  if (!Array.isArray(v)) {
    problem(path, 'is not an array');
    return [];
  }
  const bad = v.findIndex(r => !isDsRecord(r));
  if (bad >= 0) {
    problem(
      `${path}[${bad}]`,
      'is not a DS record {keyTag, algorithm, digestType, digest}',
    );
    return [];
  }
  return v.map((r: DnsZoneProviderResult['dsRecords'][number]) => ({
    keyTag: r.keyTag,
    algorithm: r.algorithm,
    digestType: r.digestType,
    digest: r.digest,
  }));
};

/** One realization the control plane reports, as a provider result. */
const realizationResult = (
  zoneName: string,
  path: string,
  v: unknown,
  assigned: ReadonlySet<DnsZoneProvider>,
  problems: string[],
): DnsZoneProviderResult => {
  if (!isObject(v)) {
    throw unexpected(DNS_ZONES, path, 'is not an object');
  }
  const provider = dnsProvider(requiredString(`${path}.provider`, v.provider));
  const status = requiredString(`${path}.status`, v.status);
  const outputs = v.outputs ?? {};
  if (!isObject(outputs)) {
    throw unexpected(DNS_ZONES, `${path}.outputs`, 'is not an object');
  }
  const problem = (at: string, detail: string): void => {
    problems.push(`${zoneName} (${provider}): ${at} ${detail}`);
  };
  return {
    provider,
    assigned: assigned.has(provider),
    status,
    message: optionalString(DNS_ZONES, `${path}.message`, v.message, ''),
    zoneId: outputZoneId(`${path}.outputs.zoneId`, outputs.zoneId, problem),
    nameServers: outputNameServers(
      `${path}.outputs.nameServers`,
      outputs.nameServers,
      problem,
    ),
    dsRecords: outputDsRecords(
      `${path}.outputs.dsRecords`,
      outputs.dsRecords,
      problem,
    ),
    // JSON from the wire: a round trip is a full, independent copy.
    outputs: JSON.parse(JSON.stringify(outputs)) as Record<string, unknown>,
    updatedAt:
      v.updatedAt === undefined || v.updatedAt === null
        ? null
        : optionalString(DNS_ZONES, `${path}.updatedAt`, v.updatedAt, ''),
  };
};

const pendingResult = (provider: DnsZoneProvider): DnsZoneProviderResult => ({
  provider,
  assigned: true,
  status: 'Pending',
  message: '',
  zoneId: null,
  nameServers: [],
  dsRecords: [],
  outputs: {},
  updatedAt: null,
});

/**
 * The providers a zone is assigned to: `assignedProviders`, every cloud hosting a
 * copy. `assignedProvider` (the single host, empty otherwise) is read when the
 * control plane sends no non-empty `assignedProviders`.
 */
const assignedProviders = (
  path: string,
  z: Record<string, unknown>,
): DnsZoneProvider[] => {
  const many = optionalStrings(
    DNS_ZONES,
    `${path}.assignedProviders`,
    z.assignedProviders,
  );
  const raw =
    many.length > 0
      ? many
      : [
          optionalString(
            DNS_ZONES,
            `${path}.assignedProvider`,
            z.assignedProvider,
            '',
          ),
        ];
  return [...new Set(raw.filter(p => p.length > 0).map(dnsProvider))];
};

const environmentDnsZone = (
  path: string,
  z: unknown,
  problems: string[],
): EnvironmentDnsZone => {
  if (!isObject(z)) {
    throw unexpected(DNS_ZONES, path, 'is not an object');
  }
  const name = requiredString(`${path}.zoneName`, z.zoneName);
  if (typeof z.declared !== 'boolean') {
    throw unexpected(DNS_ZONES, `${path}.declared`, 'is not a boolean');
  }
  const assigned = assignedProviders(path, z);
  const assignedSet = new Set(assigned);
  const realizations = z.realizations ?? [];
  if (!Array.isArray(realizations)) {
    throw unexpected(DNS_ZONES, `${path}.realizations`, 'is not an array');
  }
  const reported = realizations.map((r: unknown, i: number) =>
    realizationResult(
      name,
      `${path}.realizations[${i}]`,
      r,
      assignedSet,
      problems,
    ),
  );
  const byProvider = new Map(reported.map(r => [r.provider, r]));
  const results = [
    ...assigned.map(p => byProvider.get(p) ?? pendingResult(p)),
    ...reported.filter(r => !assignedSet.has(r.provider)),
  ];
  const reason = optionalString(
    DNS_ZONES,
    `${path}.unassigned`,
    z.unassigned,
    '',
  );
  return {
    name,
    declared: z.declared,
    unassignedReason: reason.length === 0 ? null : reason,
    results,
  };
};

const checkDnsZonesId = (id: EnvironmentId): void => {
  const what = "Reading an environment's DNS zones";
  if (id.ownerId === undefined || id.ownerId.trim().length === 0) {
    throw new Error(`${what} requires an ownerId.`);
  }
  if (!GUID_RE.test(id.ownerId)) {
    throw new Error(`${what}: ownerId must be a GUID, got '${id.ownerId}'.`);
  }
  if (id.shortName === undefined || id.shortName.trim().length === 0) {
    throw new Error(`${what} requires a shortName.`);
  }
  if (id.shortName.length > MAX_SHORT_NAME_LENGTH) {
    throw new Error(
      `${what}: shortName must not be longer than ${MAX_SHORT_NAME_LENGTH} characters.`,
    );
  }
};

/**
 * Read an environment's DNS zones as its cloud agents realized them
 * (`GET /environments/{type}/{ownerId}/{shortName}/dns-zones`): per zone, one
 * result per provider with its status, `zoneId`, `nameServers` and
 * `dsRecords` — the NS and DS values a registrar needs to delegate the domain.
 * `null` when the environment does not exist. An output field an agent reported
 * malformed is left empty on its result and named in `problems`.
 */
export async function getEnvironmentDnsZones(
  id: EnvironmentId,
  cfg: ApiConfig,
): Promise<EnvironmentDnsZones | null> {
  checkDnsZonesId(id);
  const res = await send(
    cfg,
    superagent
      .get(
        `${environmentsUrl(cfg)}/${pathSegment(id.type)}/${pathSegment(id.ownerId)}/${pathSegment(id.shortName)}/dns-zones`,
      )
      .ok(r => r.status === 200 || r.status === 404)
      .set(authHeaders(cfg)),
  );
  if (res.status !== 200) {
    return null;
  }
  const body: unknown = res.body;
  if (!isObject(body)) {
    throw unexpected(DNS_ZONES, 'body', 'is not an object');
  }
  const zones = body.zones ?? [];
  if (!Array.isArray(zones)) {
    throw unexpected(DNS_ZONES, 'zones', 'is not an array');
  }
  const problems = optionalStrings(DNS_ZONES, 'problems', body.problems);
  return {
    zones: zones.map((z: unknown, i: number) =>
      environmentDnsZone(`zones[${i}]`, z, problems),
    ),
    problems,
  };
}
