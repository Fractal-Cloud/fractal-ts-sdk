/** ci/credentials/azure_static_ci_credentials.ts — Azure through a service
 *  principal secret kept as a CI secret (the standard way). */
import type {CiValue} from './ci_value';

export type AzureStaticCiCredentials = {
  clientId: string;
  clientSecret: CiValue;
  /** The subscriptions these credentials serve; requests for any other are refused. */
  subscriptionIds: readonly string[];
};
