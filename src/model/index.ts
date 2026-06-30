/**
 * index.ts — public barrel for the LOCKED Fractal model (see docs/fractal-model.md).
 *
 * Re-exports the engine plus the full Component catalogue (abstract components,
 * one factory per Component with typed agnostic `.withXxx()` setters) and the
 * Offer catalogue (vendor + vendor-neutral offers declaring what they satisfy).
 */

// Engine
export * from './core';

// Deploy service (deploy/destroy a LiveSystem to the Fractal Cloud API)
export * from './service';

// Component catalogue (abstract — vendor-agnostic)
export * from './components/network_and_compute';
export * from './components/storage';
export * from './components/big_data';
export * from './components/messaging';
export * from './components/api_management';
export * from './components/observability';
export * from './components/security';
export * from './components/custom_workloads';

// Offer catalogue (concrete — vendor or vendor-neutral)
export * from './offers/network_and_compute';
export * from './offers/storage';
export * from './offers/big_data';
export * from './offers/messaging';
export * from './offers/api_management';
export * from './offers/observability';
export * from './offers/security';
export * from './offers/custom_workloads';
