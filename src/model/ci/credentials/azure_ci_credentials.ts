/** ci/credentials/azure_ci_credentials.ts — Azure credentials for a set of subscriptions. */
import type {AzureOidcCiCredentials} from './azure_oidc_ci_credentials';
import type {AzureStaticCiCredentials} from './azure_static_ci_credentials';

export type AzureCiCredentials =
  AzureOidcCiCredentials | AzureStaticCiCredentials;
