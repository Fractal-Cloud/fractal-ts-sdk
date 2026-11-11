import {isSecretRef} from '../secret';

/**
 * The first variable of a `secretEnv` map whose value is not an
 * environment-secret reference, or undefined when every value is one. The
 * agents' contracts type `secretEnv` only as `object`, so nothing after the SDK
 * can tell a reference from the secret itself: an offer refuses that variable
 * before the value is stored on the Live System at all, naming the variable and
 * never its value.
 */
export const rawSecretEnvVariable = (
  secretEnv: Readonly<Record<string, unknown>>,
): string | undefined =>
  Object.entries(secretEnv).find(([, value]) => !isSecretRef(value))?.[0];
