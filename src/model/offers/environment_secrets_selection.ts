import type {Offer} from '../core';

/**
 * `withEnvironmentSecrets`, on an offer whose config carries
 * `environmentSecretShortNames`: the generated contract declares that key only
 * for an offer every agent of which publishes `canAccessSecrets`. Any other
 * offer has no such member, so selecting secrets for it does not compile.
 *
 * A config type with an index signature (`Record<string, never>`, a config
 * with no keys) names every string, so it is excluded first.
 */
export type EnvironmentSecretsSelection<
  C extends string,
  Cfg,
> = string extends keyof Cfg
  ? unknown
  : 'environmentSecretShortNames' extends keyof Cfg
    ? {
        /**
         * The environment secrets the component may access, by short name
         * (the identifier `secretRef(...)` uses): sent as the component
         * parameter `environmentSecretShortNames`. Replaces any earlier
         * selection.
         */
        readonly withEnvironmentSecrets: (
          shortNames: readonly string[],
        ) => Offer<C, Cfg> & EnvironmentSecretsSelection<C, Cfg>;
      }
    : unknown;
