/**
 * environment/types.ts — value types + validation for the Environment surface.
 *
 * An Environment is a control-plane resource (NOT part of the Fractal blueprint):
 * a governance scope a LiveSystem is deployed into. Mirrors the Java SDK's
 * environment domain (ManagementEnvironment / OperationalEnvironment, Secret,
 * CiCdProfile, cloud-agent config). See ~/Projects/CLAUDE.md.
 *
 * NB: the control-plane API still calls the owning scope a "Resource Group"; the
 * SDK surface stays with the API's `EnvironmentId` shape here (type/ownerId/
 * shortName), never exposing the term to describe a Bounded Context.
 */
import type {DnsRecord, DnsZoneGuardrails} from '../components/dns';
import type {CloudAccount, CloudAgent} from './cloud_agents';

/** Ownership flavor of an environment (matches the API's environment type). */
export type EnvironmentType = 'Personal' | 'Organizational';

/** Fully-qualified environment identity. `shortName` is the env's own segment. */
export type EnvironmentId = {
  type: EnvironmentType;
  ownerId: string;
  shortName: string;
};

/** Cloud providers an environment's agents can target. */
export type ProviderType = 'AWS' | 'AZURE' | 'GCP' | 'OCI' | 'HETZNER';

/** A resource-group id in the API's string form: `Type/ownerId/name`. */
export type ResourceGroupId = string;

/** A secret stored on an environment, referenceable by workloads by short name. */
export type Secret = {
  shortName: string;
  displayName: string;
  description?: string;
  value: string;
};

/** A CI/CD profile (SSH deploy key) attached to an environment. */
export type CiCdProfile = {
  shortName: string;
  displayName: string;
  description?: string;
  sshPrivateKeyData: string;
  sshPrivateKeyPassphrase?: string;
};

/**
 * One of an environment's agents, as a DNS zone selects it: the agent (or, on an
 * operational environment, the cloud account) as declared on the environment, or
 * its agent id — `{type}` for an agent bound per account (`aws`, `gcp`, `azure`,
 * see {@link agentIdOf}) or `{type}:{shortName}` for one bound by name, such as an
 * ARIA agent (`aria:caas-k8s`).
 */
export type DnsZoneAgent = string | CloudAgent | CloudAccount;

/**
 * A DNS zone registered on an environment. It carries the same guardrails and
 * records as the DNS Zone component (`DnsZoneComponent`), so an environment zone
 * and the atom share one shape. Every agent of the environment that hosts DNS
 * zones realizes its own copy, in the account / project / subscription of the
 * environment that declares it. `name` is the zone's domain (the component calls
 * it `domainName`).
 */
export type DnsZone = DnsZoneGuardrails & {
  name: string;
  /**
   * Optional, and not needed in the common case: omitted, every agent of the
   * environment that hosts DNS zones hosts its own copy, with the same records.
   * Set it only to narrow the zone to some of the environment's agents. Which
   * agents host DNS zones is what each agent declares to the control plane, not
   * something this SDK decides. Selecting an agent the environment does not have,
   * or one that does not host DNS zones, is refused; repeating one is harmless.
   * A zone is never signed by more than one agent (multi-signer DNSSEC is not
   * supported): `dnssec: 'required'` needs a single host, and `'optional'` on
   * several hosts is served unsigned.
   */
  agents?: readonly DnsZoneAgent[];
  /**
   * @deprecated Omit it (every agent hosts the zone) or use `agents`. A hint that
   * names one agent (`aws`, `gcp`, `azure` or an offer type); ignored when
   * `agents` is set.
   */
  dnsZoneType?: string;
  /** Record sets of the zone, validated against the guardrails. */
  records?: DnsRecord[];
};

/**
 * AWS cloud-agent credentials, sent with `initialize` and `update`:
 *
 * - `{accessKeyId, secretAccessKey, sessionToken}` — an assumed-role session
 *   (what `aws-actions/configure-aws-credentials` or any `sts:AssumeRole`
 *   produces), sent as `X-AWS-Access-Key-ID`, `X-AWS-Secret-Access-Key` and
 *   `X-AWS-Session-Token`.
 * - `{accessKeyId, secretAccessKey}` — long-lived keys, sent as the first two
 *   headers only. The control plane holds them in memory for the run and checks
 *   their account with `sts:GetCallerIdentity`. They are not exchanged for a
 *   `sts:GetSessionToken` session, which could not call IAM without MFA.
 * - `{roleArn, webIdentityToken}` — federated web identity, sent as
 *   `X-AWS-Role-Arn` / `X-AWS-Web-Identity-Token`. The control plane exchanges
 *   the token with one `sts:AssumeRoleWithWebIdentity` at request time; the role
 *   must be in the target account.
 *
 * The second and third shapes need fractal-environments v3.32.0 or later; an
 * older control plane's refusal says so. A set missing `accessKeyId` or
 * `secretAccessKey`, or carrying an empty `sessionToken`, is refused before
 * anything is sent.
 */
export type AwsCredentials =
  | {accessKeyId: string; secretAccessKey: string; sessionToken?: string}
  | {roleArn: string; webIdentityToken: string};

/** Azure cloud-agent credentials: static service principal (client id + secret)
 *  or workload-identity federation (app-registration client id + a federated
 *  token used as the client assertion). */
export type AzureCredentials =
  | {spClientId: string; spClientSecret: string}
  | {clientId: string; federatedToken: string};

/** GCP cloud-agent credentials: static service account (email + credentials JSON)
 *  or workload-identity federation (service account to impersonate + WIF provider
 *  + a federated token exchanged for a GCP access token). */
export type GcpCredentials =
  | {serviceAccountEmail: string; serviceAccountCredentials: string}
  | {
      serviceAccountEmail: string;
      workloadIdentityProvider: string;
      federatedToken: string;
    };

/** Per-provider credentials for cloud-agent initialization (explicit — no env
 *  var reads). Only the providers whose agents you initialize are required.
 *  Each of aws/azure/gcp accepts a static or a federated (OIDC) variant,
 *  discriminated structurally. */
export type ProviderCredentials = {
  aws?: AwsCredentials;
  azure?: AzureCredentials;
  gcp?: GcpCredentials;
  oci?: {serviceAccountId: string; serviceAccountCredentials: string};
  hetzner?: {token: string};
};

/** Context handed to a {@link ProviderCredentialsResolver}: which environment,
 *  and which cloud agent of it, is about to be initialized. */
export type ProviderCredentialsRequest = {
  /** The environment being initialized. */
  environment: EnvironmentId;
  /** `management` for the management env itself, `operational` otherwise. */
  tier: 'management' | 'operational';
  /** The provider whose agent is being initialized. */
  provider: ProviderType;
  /** The cloud account the agent lands in (AWS account id, Azure subscription
   *  id, GCP/Hetzner project id, OCI compartment id). Lets one resolver mint
   *  credentials for the right account, e.g. by assuming a role in it. */
  accountId: string;
  /** The agent's region. */
  region: string;
};

/**
 * Per-environment credentials: called once for each cloud agent the deploy is
 * about to initialize — and only then, so an environment whose agent is already
 * initialized never has its credentials requested. Return `undefined` (or
 * credentials lacking the provider) to fail that initialization with a clear
 * error. May be async, which lets a caller mint short-lived credentials (e.g.
 * `sts:AssumeRole`) right before they are used rather than at process start —
 * relevant because waiting on a management initialization can take most of an
 * hour.
 */
export type ProviderCredentialsResolver = (
  request: ProviderCredentialsRequest,
) => ProviderCredentials | undefined | Promise<ProviderCredentials | undefined>;

/** Network provisioning tier of an environment (`networkTier` parameter). */
export type NetworkTier = 'prod' | 'nonprod';

/** The environment parameter key the control plane reads the tier from. */
export const NETWORK_TIER_PARAMETER = 'networkTier';

/** Allowed {@link NetworkTier} values, for runtime validation. */
export const NETWORK_TIERS: readonly NetworkTier[] = ['prod', 'nonprod'];

/**
 * Parameter keys the builders own structurally (`withAwsCloudAgent` /
 * `withAwsAccount` → `agents`, `withTags` → `tags`, `withDnsZones` →
 * `dnsZones`). `withParameter` refuses them so there is one way to set each.
 */
export const RESERVED_ENVIRONMENT_PARAMETERS: readonly string[] = [
  'agents',
  'tags',
  'dnsZones',
];

/** Lifecycle status the control plane reports for an environment. */
export type EnvironmentStatus =
  | 'Unknown'
  | 'Active'
  | 'Failed'
  | 'Deleted'
  | 'Pending'
  | 'Stale'
  // Forward-compatible: a status added server-side still type-checks.
  | (string & {});

/**
 * One row of `cloud.environments.list(...)`, as the control plane returns it.
 * `initializedClouds` names each provider with a Completed initialization run,
 * spelled as the server spells them (`Aws`, `Azure`, `Gcp`, `Oci`, `Hetzner`,
 * `Aria`, `Aruba`) — NOT as {@link ProviderType}.
 */
export type EnvironmentSummary = {
  id: EnvironmentId;
  name: string;
  status: EnvironmentStatus;
  resourceGroups: string[];
  initializedClouds: string[];
};

/** One environment as `cloud.environments.get(id)` returns it. */
export type EnvironmentDetails = {
  id: EnvironmentId;
  /** `null` for a management environment. */
  managementEnvironmentId: EnvironmentId | null;
  name: string;
  status: EnvironmentStatus;
  resourceGroups: string[];
  /** Every parameter the server holds, including keys the SDK never set
   *  (e.g. a `networkTier` set in the web UI, or agents the server wrote). */
  parameters: Record<string, unknown>;
  defaultCiCdProfileShortName: string | null;
};

// ── id formatting ─────────────────────────────────────────────────────────────
/** API path/id form of an environment id: `Type/ownerId/shortName`. */
export const formatEnvironmentId = (id: EnvironmentId): string =>
  `${id.type}/${id.ownerId}/${id.shortName}`;

// ── validation (mirrors the Java SDK rules) ────────────────────────────────────
const SHORT_NAME_ID_RE = /^[a-z0-9-]+$/;
// alphanumerics + interior hyphens, no leading/trailing hyphen
const ALNUM_HYPHENS_RE = /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*$/;

const isBlank = (s: string | undefined | null): boolean =>
  s === undefined || s === null || s.trim().length === 0;

/** Validate an environment short name (id segment): ≤30 chars, `[a-z0-9-]`. */
export const validateEnvironmentShortName = (shortName: string): string[] => {
  const errors: string[] = [];
  if (isBlank(shortName)) {
    errors.push('Environment shortName is required.');
    return errors;
  }
  if (shortName.length > 30) {
    errors.push('Environment shortName must not be longer than 30 characters.');
  }
  if (!SHORT_NAME_ID_RE.test(shortName)) {
    errors.push(
      'Environment shortName must only contain lowercase letters, numbers, and dashes.',
    );
  }
  return errors;
};

/** Validate a secret. Returns a list of human-readable errors (empty = valid). */
export const validateSecret = (s: Secret): string[] => {
  const errors: string[] = [];
  if (isBlank(s.shortName) || !ALNUM_HYPHENS_RE.test(s.shortName)) {
    errors.push(
      '[Secret] shortName must be alphanumerics and hyphens, not starting or ending with a hyphen.',
    );
  }
  if (isBlank(s.displayName)) {
    errors.push('[Secret] displayName cannot be empty.');
  }
  if (isBlank(s.value)) {
    errors.push('[Secret] value cannot be empty.');
  }
  return errors;
};

/** Validate a CI/CD profile. Returns a list of human-readable errors. */
export const validateCiCdProfile = (p: CiCdProfile): string[] => {
  const errors: string[] = [];
  if (isBlank(p.shortName) || !ALNUM_HYPHENS_RE.test(p.shortName)) {
    errors.push(
      '[CiCdProfile] shortName must be alphanumerics and hyphens, not starting or ending with a hyphen.',
    );
  }
  if (isBlank(p.displayName)) {
    errors.push('[CiCdProfile] displayName cannot be empty.');
  }
  if (isBlank(p.sshPrivateKeyData)) {
    errors.push('[CiCdProfile] sshPrivateKeyData cannot be empty.');
  }
  return errors;
};
