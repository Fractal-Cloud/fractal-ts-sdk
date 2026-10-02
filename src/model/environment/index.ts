/**
 * environment/index.ts — barrel for the Environment surface.
 *
 * Control-plane environment management (management + operational tiers, cloud
 * agents, secrets, CI/CD profiles) + `deployEnvironment`. Orthogonal to the
 * Fractal blueprint model; a LiveSystem is deployed INTO an environment via
 * `management.ref()` / `management.operational(name).ref()`.
 */
export * from './types';
export * from './cloud_agents';
export * from './environment';
export type * from './dns_zone_provider';
export type * from './dns_zone_result_status';
export type * from './dns_zone_provider_result';
export type * from './environment_dns_zone';
export type * from './environment_dns_zones';
// The deploy operation itself lives on the client (`cloud.environments.deploy`)
// so credentials are held in one place; only its options type is public here.
export type {DeployEnvironmentOptions} from './service';
export type * from './deployed_agent';
export type * from './skipped_agent_reason';
export type * from './skipped_agent';
export type * from './environment_deploy_result';
export type * from './environment_plan_action';
export type * from './environment_plan_entry';
export type * from './environment_plan';
export {formatEnvironmentPlan, environmentPlanMarkdown} from './plan_rendering';
// Exposed so a caller can predict exactly what a deploy will write.
export {mergeEnvironmentParameters} from './service';
// Thrown by a providerCredentials resolver for a cloud this run holds no
// credentials for; the deploy skips that agent with a notice.
export {ProviderCredentialsNotConfigured} from './provider_credentials_not_configured';
