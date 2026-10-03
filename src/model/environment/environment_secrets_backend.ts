/**
 * environment/environment_secrets_backend.ts — where the AWS agent stores an
 * environment's secrets (`environmentSecretsBackend` parameter).
 *
 * - `ssm-parameter-store` (the agent default): a `SecureString` parameter
 *   `/fractal/environment-secrets/<environmentShortName>/<secretShortName>`,
 *   encrypted with a per-environment KMS key; secret values are limited to 4 KB.
 * - `secrets-manager`: the legacy layout, a Secrets Manager secret
 *   `secret-<uuid>` per environment secret.
 *
 * The agent fails the Live System on any other value, so the SDK refuses it
 * before deploying.
 */
export type EnvironmentSecretsBackend =
  'ssm-parameter-store' | 'secrets-manager';

/** The environment parameter key the AWS agent reads the backend from. */
export const ENVIRONMENT_SECRETS_BACKEND_PARAMETER =
  'environmentSecretsBackend';

/** Allowed {@link EnvironmentSecretsBackend} values, for runtime validation. */
export const ENVIRONMENT_SECRETS_BACKENDS: readonly EnvironmentSecretsBackend[] =
  ['ssm-parameter-store', 'secrets-manager'];

/**
 * Whether the AWS agent accepts `value` for the backend parameter: blank (its
 * default) or one of {@link ENVIRONMENT_SECRETS_BACKENDS}, trimmed and matched
 * case-insensitively, as the agent reads it.
 */
export const isAcceptedEnvironmentSecretsBackend = (
  value: unknown,
): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  const wanted = value.trim().toLowerCase();
  return (
    wanted === '' ||
    ENVIRONMENT_SECRETS_BACKENDS.some(backend => backend === wanted)
  );
};

/** The largest value, in UTF-8 bytes, an SSM Standard-tier parameter holds. */
export const SSM_PARAMETER_STORE_MAX_VALUE_BYTES = 4096;

/**
 * Why the declared secrets cannot be stored by the AWS agent, prefixed with
 * `label`: on the SSM backend (the default) a value over 4096 UTF-8 bytes is
 * refused at patrol time. Names the secret, never its value.
 */
export const secretsTooLargeForBackend = (
  label: string,
  backend: unknown,
  secrets: readonly {shortName: string; value: string}[],
): string[] => {
  const declared =
    typeof backend === 'string' ? backend.trim().toLowerCase() : '';
  if (declared !== '' && declared !== 'ssm-parameter-store') {
    return [];
  }
  const errors: string[] = [];
  for (const secret of secrets) {
    const bytes = new TextEncoder().encode(secret.value ?? '').length;
    if (bytes > SSM_PARAMETER_STORE_MAX_VALUE_BYTES) {
      errors.push(
        `${label}: secret '${secret.shortName}' is ${bytes} bytes, above the ` +
          `${SSM_PARAMETER_STORE_MAX_VALUE_BYTES} an SSM Parameter Store parameter holds. ` +
          "Shorten it, or store this environment's secrets in Secrets Manager with " +
          "withEnvironmentSecretsBackend('secrets-manager').",
      );
    }
  }
  return errors;
};
