/** ci/adapters/present.ts — a CI variable, `undefined` when absent or empty. */
import type {CiEnvironment} from '../ci_environment';

export const present = (
  env: CiEnvironment,
  name: string,
): string | undefined => {
  const value = env[name];
  return value === undefined || value.length === 0 ? undefined : value;
};
