/**
 * index.ts — public barrel for the LOCKED Fractal model (see docs/fractal-model.md).
 *
 * Re-exports the engine plus the full Component catalogue (abstract components,
 * one factory per Component with typed agnostic `.withXxx()` setters) and the
 * Offer catalogue (vendor + vendor-neutral offers declaring what they satisfy).
 */

// Engine
export * from './core';

// Environment-secret references (usable in component params + link settings)
export * from './secret';

// Shared HTTP contract (credentials type surfaced publicly)
export type {Credentials, ApiConfig} from './http';

// The error every API operation throws. Exported so a caller can branch on it
// (`err instanceof FractalApiError`, `err.status`, `err.reasonCode`) — necessary
// because it deliberately does NOT carry the superagent request/response objects,
// which is what used to print the client secret when an error was logged.
export {FractalApiError, redactSecrets, REDACTED} from './api-error';

// The API client — holds credentials + base URL once, and groups operations by
// the entity they act on (blueprints / liveSystems / environments). Registering a
// blueprint and deploying a LiveSystem are separate operations on separate
// entities; deploying never publishes a blueprint as a side effect.
export * from './client';

// LiveSystem operation options + results (the operations live on the client).
export type {DeployOptions, ComponentState, LiveSystemState} from './service';

// Environment authoring (management + operational envs, cloud agents, secrets,
// CI/CD profiles). Deploying them is `cloud.environments.deploy`.
export * from './environment';

// Component catalogue (abstract — vendor-agnostic)
export * from './components/network_and_compute';
export * from './components/storage';
export * from './components/big_data';
export * from './components/messaging';
export * from './components/api_management';
export * from './components/observability';
export * from './components/security';
export * from './components/custom_workloads';
export * from './components/unmanaged';

// Offer catalogue (concrete — vendor or vendor-neutral)
export * from './offers/network_and_compute';
export * from './offers/storage';
export * from './offers/big_data';
export * from './offers/messaging';
export * from './offers/api_management';
export * from './offers/observability';
export * from './offers/security';
export * from './offers/custom_workloads';
export * from './offers/unmanaged';
