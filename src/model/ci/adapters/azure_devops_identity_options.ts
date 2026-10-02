/** ci/adapters/azure_devops_identity_options.ts — which service connection's
 *  federated identity an Azure DevOps job mints tokens for. */
export type AzureDevOpsIdentityOptions = {
  /**
   * The service connection whose workload identity the token asserts (its
   * subject is `sc://<organization>/<project>/<service connection>`). Defaults
   * to `AZURESUBSCRIPTION_SERVICE_CONNECTION_ID`, which the AzureCLI@2 and
   * AzurePowerShell@5 tasks set.
   */
  serviceConnectionId?: string;
};
