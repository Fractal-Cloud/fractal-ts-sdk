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
export type * from './cloud_agent_target';
export type * from './update_environment_agents_options';
// Exposed so a caller can predict exactly what a deploy will write.
export {mergeEnvironmentParameters} from './service';
