/** ci/detect_ci_options.ts — what {@link detectCi} cannot read from the environment. */
import type {AzureDevOpsIdentityOptions} from './adapters/azure_devops_identity_options';

export type DetectCiOptions = {
  azureDevOps?: AzureDevOpsIdentityOptions;
  /** The HTTP client token requests use. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
};
