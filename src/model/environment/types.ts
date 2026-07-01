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

/** A DNS zone registered on an environment. */
export type DnsZone = {
  name: string;
  /** Optional provider hint; the agent resolves the concrete zone. */
  dnsZoneType?: string;
};

/** Per-provider credentials for cloud-agent initialization (explicit — no env
 *  var reads). Only the providers whose agents you initialize are required. */
export type ProviderCredentials = {
  aws?: {accessKeyId: string; secretAccessKey: string; sessionToken?: string};
  azure?: {spClientId: string; spClientSecret: string};
  gcp?: {serviceAccountEmail: string; serviceAccountCredentials: string};
  oci?: {serviceAccountId: string; serviceAccountCredentials: string};
  hetzner?: {token: string};
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
