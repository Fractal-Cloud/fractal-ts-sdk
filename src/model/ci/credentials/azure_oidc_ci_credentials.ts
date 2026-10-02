/** ci/credentials/azure_oidc_ci_credentials.ts — Azure through an app
 *  registration's federated credential for the CI's OIDC identity (recommended). */
export type AzureOidcCiCredentials = {
  /** The app registration's (public) client id. */
  clientId: string;
  /** The subscriptions these credentials serve; requests for any other are refused. */
  subscriptionIds: readonly string[];
  /** Token audience. Default `api://AzureADTokenExchange`. */
  audience?: string;
};
