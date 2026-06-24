// BFF offer id: NetworkAndCompute.CaaS.ECSTaskDefinition
//
// The AWS ECS Task Definition is a live-system-only sub-component of the ECS
// Service offer. Under the Fractal + Interface model it has no standalone
// offer: the `EcsService` offer (see ./ecs_service.ts) builds the task
// definition inline from the abstract Workload's neutral parameters and wires
// it as a dependency of the primary service. This module intentionally exports
// nothing — the legacy standalone `AwsEcsTaskDefinition` builder/satisfy API
// was removed during the M1 migration.

export {};
