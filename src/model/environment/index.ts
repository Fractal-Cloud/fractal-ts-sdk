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
export * from './service';
