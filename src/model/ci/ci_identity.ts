/**
 * ci/ci_identity.ts — PORT: the OIDC identity a CI job proves itself with.
 *
 * A cloud that trusts the CI's issuer exchanges the token for short-lived cloud
 * credentials, so no long-lived cloud secret has to be stored in the CI system.
 * The token is a credential: implementations never log it, and callers mask it
 * (see {@link CiReporter.mask}) before anything else can print it.
 */
export type CiIdentity = {
  /** Mints a fresh ID token for `audience`, right now. Never cached. */
  idToken: (audience: string) => Promise<string>;
  /**
   * Set when the CI issues tokens for one audience only and ignores any other
   * (Azure DevOps: `api://AzureADTokenExchange`). Callers use it in place of a
   * cloud's default audience, and the cloud must be configured to accept it.
   */
  readonly fixedAudience?: string;
};
