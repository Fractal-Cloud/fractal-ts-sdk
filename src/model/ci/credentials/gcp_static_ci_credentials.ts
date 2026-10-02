/** ci/credentials/gcp_static_ci_credentials.ts — GCP through a service-account
 *  key kept as a CI secret (the standard way). */
import type {CiValue} from './ci_value';

export type GcpStaticCiCredentials = {
  /** The key file's JSON; the service account is its `client_email`. */
  serviceAccountKey: CiValue;
  /** The projects these credentials serve; requests for any other are refused. */
  projectIds: readonly string[];
};
