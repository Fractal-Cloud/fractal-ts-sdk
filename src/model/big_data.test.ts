/**
 * big_data.test.ts — executable spec for the BigData domain on the LOCKED
 * Fractal model. Authors a vendor-agnostic data platform Fractal (ComputeCluster
 * + DataProcessingJob depending on the cluster + MlExperiment + Datalake),
 * applies guardrails, specializes with a dev-open op, and builds a LiveSystem by
 * per-component offer selection (Databricks for cluster/job/experiment + an S3
 * datalake). Mirrors secure_public_api.test.ts.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {
  ComputeCluster,
  DataProcessingJob,
  MlExperiment,
  Datalake,
} from './components/big_data';
import {
  AwsDatabricksCluster,
  AwsDatabricksJob,
  AwsDatabricksMlflow,
  AwsS3Datalake,
} from './offers/big_data';

const environment = {id: 'test-env'};
const boundedContextId = {id: 'data-templates'};

// ── Architect authors ONCE, vendor-agnostic, with guardrails. ─────────────────
function authorFractal() {
  return createFractal({
    id: 'data-platform',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const cluster = bp.add(
        ComputeCluster({id: 'cluster'})
          .withSparkVersion('14.3.x-scala2.12')
          .withMaxWorkers(10)
          .withAutoTerminationMinutes(30),
      );
      const job = bp.add(
        DataProcessingJob({id: 'etl-job'})
          .withTaskType('python_wheel')
          .withMaxRetries(3)
          .dependsOn(cluster),
      );
      const experiment = bp.add(
        MlExperiment({id: 'experiment'}).withExperimentName('fraud-model'),
      );
      const lake = bp.add(
        Datalake({id: 'lake'})
          .withRegion('us-east-1')
          .withVersioningEnabled(true)
          .withRetentionDays(365),
      );
      return {cluster, job, experiment, lake};
    },
    operations: s => ({
      // dev-open: clusterName was NOT pre-locked, so devs may set it
      withClusterName: (v: string) => s.cluster.set('clusterName', v),
      withJobSchedule: (v: string) => s.job.set('cronSchedule', v),
    }),
  });
}

const fullSelect = () => ({
  cluster: AwsDatabricksCluster({}),
  'etl-job': AwsDatabricksJob({}),
  experiment: AwsDatabricksMlflow({}),
  lake: AwsS3Datalake({bucket: 'acme-lake'}),
});

describe('BigData domain — data-platform Fractal', () => {
  it('blueprint is vendor-agnostic: abstract BigData Components, no offers', () => {
    const bp = authorFractal().blueprint;
    expect(bp.components.map(c => c.component)).toEqual([
      'BigData.ComputeCluster',
      'BigData.DataProcessingJob',
      'BigData.MlExperiment',
      'BigData.Datalake',
    ]);
    for (const c of bp.components) {
      expect(c).not.toHaveProperty('offers');
    }
  });

  it('guardrails are recorded and locked', () => {
    const cluster = authorFractal().blueprint.components.find(
      c => c.id === 'cluster',
    )!;
    expect(cluster.parameters.maxWorkers).toBe(10);
    expect(cluster.parameters.autoTerminationMinutes).toBe(30);
    expect(cluster.locked).toContain('maxWorkers');
    expect(cluster.locked).toContain('autoTerminationMinutes');
  });

  it('job depends on the cluster', () => {
    const job = authorFractal().blueprint.components.find(
      c => c.id === 'etl-job',
    )!;
    expect(job.dependencies).toContain('cluster');
  });

  it('builds a LiveSystem via offer selection; Databricks cluster type & provider; dev-open flows', () => {
    const ls = authorFractal()
      .specialize()
      .withClusterName('acme-etl-cluster')
      .withJobSchedule('0 2 * * *')
      .toLiveSystem({name: 'acme-data', environment, select: fullSelect()});

    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));
    // livesystem cluster offer type & provider
    expect(byId['cluster'].type).toBe('BigData.PaaS.AwsDatabricksCluster');
    expect(byId['cluster'].provider).toBe('AWS');
    // dev-open neutral params flowed
    expect(byId['cluster'].parameters.clusterName).toBe('acme-etl-cluster');
    expect(byId['etl-job'].parameters.cronSchedule).toBe('0 2 * * *');
    // guardrail flowed into the live component
    expect(byId['cluster'].parameters.maxWorkers).toBe(10);
    // vendor config merged in by the offer
    expect(byId['lake'].parameters.bucket).toBe('acme-lake');
    // blueprint structure preserved: job dependencies include cluster id
    expect(byId['etl-job'].dependencies).toContain('cluster');
  });

  it('selecting an offer that does not satisfy the cluster Component is a type error AND throws', () => {
    expect(() =>
      authorFractal().toLiveSystem({
        name: 'x',
        environment,
        select: {
          ...fullSelect(),
          // @ts-expect-error S3 datalake (BigData.Datalake) cannot satisfy BigData.ComputeCluster
          cluster: AwsS3Datalake({bucket: 'x'}),
        },
      }),
    ).toThrow(/does not satisfy/);
  });
});
