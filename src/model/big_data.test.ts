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
  DistributedDataProcessing,
} from './components/big_data';
import {
  AwsDatabricks,
  AwsDatabricksCluster,
  AwsDatabricksJob,
  AwsDatabricksMlflow,
  AwsS3Datalake,
  CaaSSparkCluster,
  CaaSSparkJob,
  CaaSMlflow,
  AzureDatabricks,
  AzureDatabricksCluster,
  AzureDatabricksJob,
  AzureDatabricksMlflow,
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
  lake: AwsS3Datalake({bucket: 'acme-lake', region: 'us-east-1'}),
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

  it('vendor-neutral CaaS offers emit the offer ids the caas-k8s registry is keyed on', () => {
    // Spelled out on purpose: importing a constant would make this pass after
    // any rename. The literals are what pin the wire contract. A component
    // whose type matches no registered handler is skipped in silence.
    const ls = authorFractal().toLiveSystem({
      name: 'acme-data',
      environment,
      select: {
        ...fullSelect(),
        cluster: CaaSSparkCluster({}),
        'etl-job': CaaSSparkJob({}),
        experiment: CaaSMlflow({}),
      },
    });

    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));
    expect(byId['cluster'].type).toBe('BigData.CaaS.SparkCluster');
    expect(byId['etl-job'].type).toBe('BigData.CaaS.SparkJob');
    expect(byId['experiment'].type).toBe('BigData.CaaS.SparkMlExperiment');
    // Vendor-neutral: they run on any cluster, so no provider is emitted.
    expect(byId['cluster'].provider).toBeUndefined();
    expect(byId['etl-job'].provider).toBeUndefined();
    expect(byId['experiment'].provider).toBeUndefined();
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

// ── A Databricks platform: every dependent carries the workspace edge. ────────
// The agent resolves the workspace with getDependenciesByTypes(component,
// DATABRICKS_TYPE, <Provider>_DATABRICKS_OFFER_TYPE) and throws
// REQUIRED_PARAMETER_MISSING when the list is empty, so the cluster, the job and
// the experiment each need the workspace id in their own dependencies AND the
// far end must emit a workspace offer type. Links do not count: the agent reads
// getDependencies(), never getLinks().
function authorDatabricksPlatform() {
  return createFractal({
    id: 'databricks-platform',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const workspace = bp.add(
        DistributedDataProcessing({id: 'workspace'}).withWorkspaceName(
          'acme-analytics',
        ),
      );
      const cluster = bp.add(
        ComputeCluster({id: 'cluster'})
          .withSparkVersion('14.3.x-scala2.12')
          .dependsOn(workspace),
      );
      const job = bp.add(
        DataProcessingJob({id: 'etl-job'})
          .dependsOn(cluster)
          .dependsOn(workspace),
      );
      const experiment = bp.add(
        MlExperiment({id: 'experiment'})
          .withExperimentName('fraud-model')
          .dependsOn(workspace),
      );
      return {workspace, cluster, job, experiment};
    },
  });
}

describe('BigData domain — Databricks workspace dependency edges', () => {
  it('cluster, job and experiment all depend on the workspace in the blueprint', () => {
    const byId = Object.fromEntries(
      authorDatabricksPlatform().blueprint.components.map(c => [c.id, c]),
    );
    expect(byId['cluster'].dependencies).toContain('workspace');
    expect(byId['experiment'].dependencies).toContain('workspace');
    expect(byId['etl-job'].dependencies).toEqual(['cluster', 'workspace']);
    // The workspace itself is a root here — it may depend on a subnet for VNet
    // injection, but nothing forces it to.
    expect(byId['workspace'].dependencies).toEqual([]);
  });

  it('the workspace edges survive into the LiveSystem, pointing at a workspace offer type', () => {
    const ls = authorDatabricksPlatform().toLiveSystem({
      name: 'acme-analytics',
      environment,
      select: {
        workspace: AzureDatabricks({pricingTier: 'premium'}),
        cluster: AzureDatabricksCluster({}),
        'etl-job': AzureDatabricksJob({}),
        experiment: AzureDatabricksMlflow({}),
      },
    });

    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));
    expect(byId['workspace'].type).toBe('BigData.PaaS.AzureDatabricks');
    for (const id of ['cluster', 'etl-job', 'experiment']) {
      expect(byId[id].dependencies).toContain('workspace');
      // What the agent actually asserts: the far end of the edge is a workspace.
      const workspaceDeps = byId[id].dependencies.filter(
        d => byId[d].type === 'BigData.PaaS.AzureDatabricks',
      );
      expect(workspaceDeps).toHaveLength(1);
    }
  });

  // The AWS workspace needs two Databricks account-level artifacts the agent
  // reads with requireStringFromMap: without them AwsDatabricks fails every
  // reconcile with REQUIRED_PARAMETER_MISSING. Assert they reach the emitted
  // component's parameters under the exact keys the agent reads
  // (AwsDatabricksConfig.CREDENTIALS_ID_PARAM_KEY / STORAGE_CONFIGURATION_ID_PARAM_KEY).
  it('AwsDatabricks emits credentialsId and storageConfigurationId as parameters', () => {
    const ls = authorDatabricksPlatform().toLiveSystem({
      name: 'acme-analytics',
      environment,
      select: {
        workspace: AwsDatabricks({
          pricingTier: 'premium',
          credentialsId: 'cred-cfg-1',
          storageConfigurationId: 'storage-cfg-1',
        }),
        cluster: AwsDatabricksCluster({}),
        'etl-job': AwsDatabricksJob({}),
        experiment: AwsDatabricksMlflow({}),
      },
    });

    const workspace = ls.components.find(c => c.id === 'workspace')!;
    expect(workspace.type).toBe('BigData.PaaS.AwsDatabricks');
    expect(workspace.parameters.credentialsId).toBe('cred-cfg-1');
    expect(workspace.parameters.storageConfigurationId).toBe('storage-cfg-1');
    expect(workspace.parameters.pricingTier).toBe('premium');
  });

  it('dependsOn is additive, not replacing: repeated calls accumulate', () => {
    const lake = Datalake({id: 'lake'});
    const workspace = DistributedDataProcessing({id: 'ws'});
    const cluster = ComputeCluster({id: 'c'}).dependsOn(workspace).dependsOn(lake);
    expect(cluster.state.dependencies).toEqual(['ws', 'lake']);
  });
});
