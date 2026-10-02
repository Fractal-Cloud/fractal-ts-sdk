/** ci/credentials/gcp_ci_credentials.ts — GCP credentials for a set of projects. */
import type {GcpOidcCiCredentials} from './gcp_oidc_ci_credentials';
import type {GcpStaticCiCredentials} from './gcp_static_ci_credentials';

export type GcpCiCredentials = GcpOidcCiCredentials | GcpStaticCiCredentials;
