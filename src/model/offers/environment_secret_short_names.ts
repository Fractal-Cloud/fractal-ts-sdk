/**
 * The component parameter that selects the environment secrets a component
 * may access, on an offer whose contract says it can (`canAccessSecrets`).
 * Its values are environment-secret short names, the identifier a
 * `secretRef(...)` uses.
 */
export const ENVIRONMENT_SECRET_SHORT_NAMES_KEY = 'environmentSecretShortNames';

/**
 * `shortNames` as the parameter carries them, or an error naming what is
 * wrong by position. A refusal never echoes a value: a caller who passed a
 * secret by mistake must not see it printed.
 */
export const environmentSecretShortNames = (
  offerType: string,
  shortNames: unknown,
): string[] => {
  const what = `${offerType} ${ENVIRONMENT_SECRET_SHORT_NAMES_KEY}`;
  if (!Array.isArray(shortNames)) {
    throw new Error(`${what} takes a list of environment-secret short names.`);
  }
  const seen = new Map<string, number>();
  shortNames.forEach((name: unknown, i) => {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error(
        `${what}: item ${i} is not an environment-secret short name (value withheld).`,
      );
    }
    const first = seen.get(name);
    if (first !== undefined) {
      throw new Error(
        `${what}: items ${first} and ${i} name the same secret (value withheld).`,
      );
    }
    seen.set(name, i);
  });
  return [...shortNames];
};
