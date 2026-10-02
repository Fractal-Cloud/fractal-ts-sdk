/**
 * ci/adapters/no_ci_identity.ts — ADAPTER: the no-CI fallback, which has no
 * identity to prove. Asking it for a token is a configuration error, said so.
 */
import type {CiIdentity} from '../ci_identity';

export const noCiIdentity = (): CiIdentity => ({
  idToken: async audience => {
    throw new Error(
      `No CI OIDC identity to mint a token for audience '${audience}': this is not a GitHub Actions ` +
        'or Azure DevOps job. Use static credentials (CI secrets) here, or run in a supported CI.',
    );
  },
});
