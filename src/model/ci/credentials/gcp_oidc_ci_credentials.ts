/** ci/credentials/gcp_oidc_ci_credentials.ts — GCP through workload identity
 *  federation with the CI's OIDC identity (recommended). */
export type GcpOidcCiCredentials = {
  /** The service account the federated identity impersonates. */
  serviceAccountEmail: string;
  /** `projects/<number>/locations/global/workloadIdentityPools/<pool>/providers/<provider>`. */
  workloadIdentityProvider: string;
  /** The projects these credentials serve; requests for any other are refused. */
  projectIds: readonly string[];
  /** Token audience. Default `https://iam.googleapis.com/<workloadIdentityProvider>`
   *  (or the CI's fixed one), the only one a provider without allowed audiences accepts. */
  audience?: string;
};
