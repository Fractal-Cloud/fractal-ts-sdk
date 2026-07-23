/**
 * secret.ts — environment-secret REFERENCE for blueprint params and link settings.
 *
 * A component parameter OR a link setting may reference an environment secret by
 * its short name instead of carrying the raw value. The agent resolves the
 * reference from the environment secret store at reconciliation time and never
 * places the raw value in output fields — only a secret-store reference is
 * injected downstream. Define the secret once on the environment (`withSecret`)
 * and reference it here by the same short name:
 *
 *   UnmanagedAi({secret: secretRef('openai-api-key')});
 *   link(vm, svc, {token: secretRef('svc-token')});
 *
 * The wire shape is the tagged value `{ $envSecret: <shortName> }`; the agent
 * treats any param/setting value of this shape as a secret reference.
 */
export type SecretRef = {$envSecret: string};

/** Reference an environment secret by short name (see the environment `withSecret`). */
export const secretRef = (shortName: string): SecretRef => ({
  $envSecret: shortName,
});

/** Type guard: is a param / link-setting value an environment-secret reference? */
export const isSecretRef = (v: unknown): v is SecretRef =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as {$envSecret?: unknown}).$envSecret === 'string';
