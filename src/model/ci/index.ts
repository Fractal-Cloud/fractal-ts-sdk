/**
 * ci/index.ts — the CI kit: deploy environments from a CI job without writing
 * the CI plumbing yourself.
 *
 * PORTS (CI-agnostic): {@link CiIdentity} (OIDC tokens), {@link CiReporter}
 * (annotations, masking, run summary), composed as a {@link Ci}.
 * ADAPTERS: GitHub Actions, Azure DevOps and a local fallback, picked by
 * {@link detectCi}; a caller can supply its own for any other CI.
 * {@link credentialsFromCi} turns a Ci plus one job's cloud configuration into
 * the `providerCredentials` resolver `environments.deploy` takes.
 */
export type * from './ci_identity';
export type * from './ci_reporter';
export type * from './ci_name';
export type * from './ci';
export type * from './ci_environment';
export type * from './detect_ci_options';
export type * from './adapters/azure_devops_identity_options';
export type * from './credentials/ci_cloud';
export type * from './credentials/ci_secret_ref';
export type * from './credentials/ci_value';
export type * from './credentials/aws_oidc_ci_credentials';
export type * from './credentials/aws_static_ci_credentials';
export type * from './credentials/aws_ci_credentials';
export type * from './credentials/gcp_oidc_ci_credentials';
export type * from './credentials/gcp_static_ci_credentials';
export type * from './credentials/gcp_ci_credentials';
export type * from './credentials/azure_oidc_ci_credentials';
export type * from './credentials/azure_static_ci_credentials';
export type * from './credentials/azure_ci_credentials';
export type * from './credentials/ci_credentials_config';
export type * from './credentials/ci_credentials_options';
export {detectCi} from './detect_ci';
export {githubActionsIdentity} from './adapters/github_actions_identity';
export {githubActionsReporter} from './adapters/github_actions_reporter';
export {azureDevOpsIdentity} from './adapters/azure_devops_identity';
export {azureDevOpsReporter} from './adapters/azure_devops_reporter';
export {consoleReporter} from './adapters/console_reporter';
export {noCiIdentity} from './adapters/no_ci_identity';
export {ciSecret} from './credentials/ci_secret';
export {credentialsFromCi} from './credentials/credentials_from_ci';
