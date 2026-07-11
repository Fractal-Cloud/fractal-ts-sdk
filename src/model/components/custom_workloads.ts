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
  dependsOn: (other: AnyNode) => WorkloadNode<Id>;
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
