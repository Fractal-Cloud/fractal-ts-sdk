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
// The deploy operation itself lives on the client (`cloud.environments.deploy`)
// so credentials are held in one place; only its options type is public here.
export type {DeployEnvironmentOptions} from './service';
