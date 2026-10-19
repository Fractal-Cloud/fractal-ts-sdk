/**
 * The component parameter that selects the environment secrets a component
 * may access, on an offer whose contract says it can (`canAccessSecrets`).
 * Its values are environment-secret short names, the identifier a
 * `secretRef(...)` uses.
 */
export const ENVIRONMENT_SECRET_SHORT_NAMES_KEY = 'environmentSecretShortNames';

/** `shortNames` as the parameter carries them, or an error naming what is wrong. */
export const environmentSecretShortNames = (
  offerType: string,
  shortNames: readonly string[],
): string[] => {
  if (!Array.isArray(shortNames)) {
    throw new Error(
      `${offerType}: withEnvironmentSecrets takes a list of environment-secret short names.`,
    );
  }
  const seen = new Set<string>();
  for (const name of shortNames) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error(
        `${offerType}: withEnvironmentSecrets takes environment-secret short names; ` +
          `got ${JSON.stringify(name)}.`,
      );
    }
    if (seen.has(name)) {
      throw new Error(
        `${offerType}: withEnvironmentSecrets names '${name}' twice.`,
      );
    }
    seen.add(name);
  }
  return [...shortNames];
};
