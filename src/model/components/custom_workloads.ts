/**
 * components/custom_workloads.ts — CustomWorkloads domain Component factories
 * (Level 1, abstract).
 *
 * Each agnostic param is a typed `.withXxx()` guardrail setter (locked at design
 * time via `guardrail`). Vendor knobs never appear here — they live on Offers.
 */
import {
  ComponentNode,
  NodeState,
  AnyNode,
  newNode,
  guardrail,
  addDependency,
} from '../core';
import type {SecretRef} from '../secret';
import type {WorkloadResources} from './workload/workload_resources';
import type {WorkloadAutoscaling} from './workload/workload_autoscaling';
import type {WorkloadProbe} from './workload/workload_probe';
import type {PodDisruptionBudget} from './workload/pod_disruption_budget';
import type {WorkloadRollout} from './workload/workload_rollout';

// ── Workload ─────────────────────────────────────────────────────────────────
export type WorkloadNode<Id extends string = string> = ComponentNode<
  Id,
  'CustomWorkloads.Workload'
> & {
  withImage: (v: string) => WorkloadNode<Id>;
  withPort: (v: number) => WorkloadNode<Id>;
  withReplicas: (v: number) => WorkloadNode<Id>;
  withEnv: (v: Record<string, string>) => WorkloadNode<Id>;
  withCpuRequest: (v: string) => WorkloadNode<Id>;
  withMemoryRequest: (v: string) => WorkloadNode<Id>;
  withMaxReplicas: (v: number) => WorkloadNode<Id>;
  withHealthCheck: (v: {path: string; port: number}) => WorkloadNode<Id>;
  /**
   * Environment variables resolved from environment secrets, by variable name:
   * `{DB_PASSWORD: secretRef('accounts-db-password')}`. Only references travel;
   * the agent resolves each from the environment's secret store into the
   * workload's runtime, never into output fields.
   */
  withSecretEnv: (v: Record<string, SecretRef>) => WorkloadNode<Id>;
  withResources: (v: WorkloadResources) => WorkloadNode<Id>;
  withAutoscaling: (v: WorkloadAutoscaling) => WorkloadNode<Id>;
  withPodDisruptionBudget: (v: PodDisruptionBudget) => WorkloadNode<Id>;
  withRollout: (v: WorkloadRollout) => WorkloadNode<Id>;
  /** Time a replica is given to finish in-flight work when it is stopped. */
  withTerminationGracePeriodSeconds: (v: number) => WorkloadNode<Id>;
  /** Pause before the stop signal, so load balancers stop sending first. */
  withPreStopSleepSeconds: (v: number) => WorkloadNode<Id>;
  withReadinessProbe: (v: WorkloadProbe) => WorkloadNode<Id>;
  withLivenessProbe: (v: WorkloadProbe) => WorkloadNode<Id>;
  withStartupProbe: (v: WorkloadProbe) => WorkloadNode<Id>;
  /** Spread replicas across zones (the agent's default with more than one replica). */
  withTopologySpread: (v: boolean) => WorkloadNode<Id>;
  withNodeSelector: (v: Record<string, string>) => WorkloadNode<Id>;
  dependsOn: (other: AnyNode) => WorkloadNode<Id>;
};
const withRollout = (s: NodeState, v: WorkloadRollout): NodeState => {
  const surged =
    v.maxSurge === undefined ? s : guardrail(s, 'maxSurge', v.maxSurge);
  return v.maxUnavailable === undefined
    ? surged
    : guardrail(surged, 'maxUnavailable', v.maxUnavailable);
};
const workloadNode = <Id extends string>(s: NodeState): WorkloadNode<Id> => ({
  state: s,
  withImage: v => workloadNode<Id>(guardrail(s, 'image', v)),
  withPort: v => workloadNode<Id>(guardrail(s, 'port', v)),
  withReplicas: v => workloadNode<Id>(guardrail(s, 'replicas', v)),
  withEnv: v => workloadNode<Id>(guardrail(s, 'env', v)),
  withCpuRequest: v => workloadNode<Id>(guardrail(s, 'cpuRequest', v)),
  withMemoryRequest: v => workloadNode<Id>(guardrail(s, 'memoryRequest', v)),
  withMaxReplicas: v => workloadNode<Id>(guardrail(s, 'maxReplicas', v)),
  withHealthCheck: v => workloadNode<Id>(guardrail(s, 'healthCheck', v)),
  withSecretEnv: v => workloadNode<Id>(guardrail(s, 'secretEnv', v)),
  withResources: v => workloadNode<Id>(guardrail(s, 'resources', v)),
  withAutoscaling: v => workloadNode<Id>(guardrail(s, 'autoscaling', v)),
  withPodDisruptionBudget: v =>
    workloadNode<Id>(guardrail(s, 'podDisruptionBudget', v)),
  withRollout: v => workloadNode<Id>(withRollout(s, v)),
  withTerminationGracePeriodSeconds: v =>
    workloadNode<Id>(guardrail(s, 'terminationGracePeriodSeconds', v)),
  withPreStopSleepSeconds: v =>
    workloadNode<Id>(guardrail(s, 'preStopSleepSeconds', v)),
  withReadinessProbe: v => workloadNode<Id>(guardrail(s, 'readinessProbe', v)),
  withLivenessProbe: v => workloadNode<Id>(guardrail(s, 'livenessProbe', v)),
  withStartupProbe: v => workloadNode<Id>(guardrail(s, 'startupProbe', v)),
  withTopologySpread: v => workloadNode<Id>(guardrail(s, 'topologySpread', v)),
  withNodeSelector: v => workloadNode<Id>(guardrail(s, 'nodeSelector', v)),
  dependsOn: other => workloadNode<Id>(addDependency(s, other.state.id)),
});
export const Workload = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): WorkloadNode<Id> =>
  workloadNode<Id>(
    newNode(cfg.id, 'CustomWorkloads.Workload', cfg.displayName),
  );

// ── Function ─────────────────────────────────────────────────────────────────
export type FunctionNode<Id extends string = string> = ComponentNode<
  Id,
  'CustomWorkloads.Function'
> & {
  withSourceArtifact: (v: string) => FunctionNode<Id>;
  withRuntime: (v: string) => FunctionNode<Id>;
  withEnvironment: (v: Record<string, string>) => FunctionNode<Id>;
  withMemory: (v: number) => FunctionNode<Id>;
  withTimeout: (v: number) => FunctionNode<Id>;
  withConcurrency: (v: number) => FunctionNode<Id>;
  dependsOn: (other: AnyNode) => FunctionNode<Id>;
};
const functionNode = <Id extends string>(s: NodeState): FunctionNode<Id> => ({
  state: s,
  withSourceArtifact: v => functionNode<Id>(guardrail(s, 'sourceArtifact', v)),
  withRuntime: v => functionNode<Id>(guardrail(s, 'runtime', v)),
  withEnvironment: v => functionNode<Id>(guardrail(s, 'environment', v)),
  withMemory: v => functionNode<Id>(guardrail(s, 'memory', v)),
  withTimeout: v => functionNode<Id>(guardrail(s, 'timeout', v)),
  withConcurrency: v => functionNode<Id>(guardrail(s, 'concurrency', v)),
  dependsOn: other => functionNode<Id>(addDependency(s, other.state.id)),
});
export const Function = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): FunctionNode<Id> =>
  functionNode<Id>(
    newNode(cfg.id, 'CustomWorkloads.Function', cfg.displayName),
  );
