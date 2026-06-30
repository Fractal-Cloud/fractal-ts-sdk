/**
 * components/big_data.ts — BigData domain Component factories (Level 1, abstract).
 *
 * Each agnostic param is a typed `.withXxx()` guardrail setter (locked at design
 * time via `guardrail`). Structural relationships are declared with `dependsOn`
 * (via `addDependency`). Vendor knobs never appear here — they live on Offers.
 */
import {
  ComponentNode,
  NodeState,
  AnyNode,
  newNode,
  guardrail,
  addDependency,
} from '../core';

// ── ComputeCluster ───────────────────────────────────────────────────────────
export type ComputeClusterNode<Id extends string = string> = ComponentNode<
  Id,
  'BigData.ComputeCluster'
> & {
  withClusterName: (v: string) => ComputeClusterNode<Id>;
  withSparkVersion: (v: string) => ComputeClusterNode<Id>;
  withMinWorkers: (v: number) => ComputeClusterNode<Id>;
  withMaxWorkers: (v: number) => ComputeClusterNode<Id>;
  withAutoTerminationMinutes: (v: number) => ComputeClusterNode<Id>;
  withDataSecurityMode: (v: string) => ComputeClusterNode<Id>;
};
const computeClusterNode = <Id extends string>(
  s: NodeState,
): ComputeClusterNode<Id> => ({
  state: s,
  withClusterName: v => computeClusterNode<Id>(guardrail(s, 'clusterName', v)),
  withSparkVersion: v =>
    computeClusterNode<Id>(guardrail(s, 'sparkVersion', v)),
  withMinWorkers: v => computeClusterNode<Id>(guardrail(s, 'minWorkers', v)),
  withMaxWorkers: v => computeClusterNode<Id>(guardrail(s, 'maxWorkers', v)),
  withAutoTerminationMinutes: v =>
    computeClusterNode<Id>(guardrail(s, 'autoTerminationMinutes', v)),
  withDataSecurityMode: v =>
    computeClusterNode<Id>(guardrail(s, 'dataSecurityMode', v)),
});
export const ComputeCluster = <const Id extends string>(cfg: {
  id: Id;
}): ComputeClusterNode<Id> =>
  computeClusterNode<Id>(newNode(cfg.id, 'BigData.ComputeCluster'));

// ── DataProcessingJob ────────────────────────────────────────────────────────
export type DataProcessingJobNode<Id extends string = string> = ComponentNode<
  Id,
  'BigData.DataProcessingJob'
> & {
  withJobName: (v: string) => DataProcessingJobNode<Id>;
  withTaskType: (v: string) => DataProcessingJobNode<Id>;
  withCronSchedule: (v: string) => DataProcessingJobNode<Id>;
  withMaxRetries: (v: number) => DataProcessingJobNode<Id>;
  dependsOn: (other: AnyNode) => DataProcessingJobNode<Id>;
};
const dataProcessingJobNode = <Id extends string>(
  s: NodeState,
): DataProcessingJobNode<Id> => ({
  state: s,
  withJobName: v => dataProcessingJobNode<Id>(guardrail(s, 'jobName', v)),
  withTaskType: v => dataProcessingJobNode<Id>(guardrail(s, 'taskType', v)),
  withCronSchedule: v =>
    dataProcessingJobNode<Id>(guardrail(s, 'cronSchedule', v)),
  withMaxRetries: v => dataProcessingJobNode<Id>(guardrail(s, 'maxRetries', v)),
  dependsOn: other =>
    dataProcessingJobNode<Id>(addDependency(s, other.state.id)),
});
export const DataProcessingJob = <const Id extends string>(cfg: {
  id: Id;
}): DataProcessingJobNode<Id> =>
  dataProcessingJobNode<Id>(newNode(cfg.id, 'BigData.DataProcessingJob'));

// ── MlExperiment ─────────────────────────────────────────────────────────────
export type MlExperimentNode<Id extends string = string> = ComponentNode<
  Id,
  'BigData.MlExperiment'
> & {
  withExperimentName: (v: string) => MlExperimentNode<Id>;
};
const mlExperimentNode = <Id extends string>(
  s: NodeState,
): MlExperimentNode<Id> => ({
  state: s,
  withExperimentName: v =>
    mlExperimentNode<Id>(guardrail(s, 'experimentName', v)),
});
export const MlExperiment = <const Id extends string>(cfg: {
  id: Id;
}): MlExperimentNode<Id> =>
  mlExperimentNode<Id>(newNode(cfg.id, 'BigData.MlExperiment'));

// ── Datalake ─────────────────────────────────────────────────────────────────
export type DatalakeNode<Id extends string = string> = ComponentNode<
  Id,
  'BigData.Datalake'
> & {
  withRegion: (v: string) => DatalakeNode<Id>;
  withVersioningEnabled: (v: boolean) => DatalakeNode<Id>;
  withRetentionDays: (v: number) => DatalakeNode<Id>;
};
const datalakeNode = <Id extends string>(s: NodeState): DatalakeNode<Id> => ({
  state: s,
  withRegion: v => datalakeNode<Id>(guardrail(s, 'region', v)),
  withVersioningEnabled: v =>
    datalakeNode<Id>(guardrail(s, 'versioningEnabled', v)),
  withRetentionDays: v => datalakeNode<Id>(guardrail(s, 'retentionDays', v)),
});
export const Datalake = <const Id extends string>(cfg: {
  id: Id;
}): DatalakeNode<Id> => datalakeNode<Id>(newNode(cfg.id, 'BigData.Datalake'));

// ── DistributedDataProcessing ────────────────────────────────────────────────
export type DistributedDataProcessingNode<Id extends string = string> =
  ComponentNode<Id, 'BigData.DistributedDataProcessing'> & {
    withWorkspaceName: (v: string) => DistributedDataProcessingNode<Id>;
  };
const distributedDataProcessingNode = <Id extends string>(
  s: NodeState,
): DistributedDataProcessingNode<Id> => ({
  state: s,
  withWorkspaceName: v =>
    distributedDataProcessingNode<Id>(guardrail(s, 'workspaceName', v)),
});
export const DistributedDataProcessing = <const Id extends string>(cfg: {
  id: Id;
}): DistributedDataProcessingNode<Id> =>
  distributedDataProcessingNode<Id>(
    newNode(cfg.id, 'BigData.DistributedDataProcessing'),
  );
