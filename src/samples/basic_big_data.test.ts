/**
 * basic_big_data.test.ts
 *
 * Integration tests for the basic_big_data sample pattern.
 * Verifies the blueprint builds correctly and each provider's live system
 * maps components with the right types, dependencies, and parameters.
 */

import {describe, expect, it} from 'vitest';
import {DistributedDataProcessing} from '../fractal/component/big_data/paas/distributed_data_processing';
import {ComputeCluster} from '../fractal/component/big_data/paas/compute_cluster';
import {DataProcessingJob} from '../fractal/component/big_data/paas/data_processing_job';
import {MlExperiment} from '../fractal/component/big_data/paas/ml_experiment';
import {AwsDatabricks} from '../live_system/component/big_data/paas/aws_databricks';
import {AwsDatabricksCluster} from '../live_system/component/big_data/paas/aws_databricks_cluster';
import {AwsDatabricksJob} from '../live_system/component/big_data/paas/aws_databricks_job';
import {AwsDatabricksMlflow} from '../live_system/component/big_data/paas/aws_databricks_mlflow';
import {AzureDatabricks} from '../live_system/component/big_data/paas/azure_databricks';
import {AzureDatabricksCluster} from '../live_system/component/big_data/paas/azure_databricks_cluster';
import {AzureDatabricksJob} from '../live_system/component/big_data/paas/azure_databricks_job';
import {AzureDatabricksMlflow} from '../live_system/component/big_data/paas/azure_databricks_mlflow';
import {GcpDatabricks} from '../live_system/component/big_data/paas/gcp_databricks';
import {GcpDatabricksCluster} from '../live_system/component/big_data/paas/gcp_databricks_cluster';
import {GcpDatabricksJob} from '../live_system/component/big_data/paas/gcp_databricks_job';
import {GcpDatabricksMlflow} from '../live_system/component/big_data/paas/gcp_databricks_mlflow';

// ── Blueprint fixtures ──────────────────────────────────────────────────────

const sparkCluster = ComputeCluster.create({
  id: 'spark-cluster',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'Spark Cluster',
  clusterName: 'main-spark',
  sparkVersion: '14.3.x-scala2.12',
  nodeTypeId: 'i3.xlarge',
});

const etlJob = DataProcessingJob.create({
  id: 'etl-job',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'ETL Job',
  jobName: 'daily-etl',
  taskType: 'NOTEBOOK',
  notebookPath: '/jobs/daily-etl',
});

const trainingExp = MlExperiment.create({
  id: 'training-exp',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'Training Experiment',
  experimentName: 'model-training',
});

const platform = DistributedDataProcessing.create({
  id: 'analytics-platform',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'Analytics Platform',
  pricingTier: 'premium',
})
  .withClusters([sparkCluster])
  .withJobs([etlJob])
  .withExperiments([trainingExp]);

// ── Blueprint tests ─────────────────────────────────────────────────────────

describe('basic_big_data blueprint', () => {
  it('should create platform with correct type', () => {
    expect(platform.platform.type.toString()).toBe(
      'BigData.PaaS.DistributedDataProcessing',
    );
    expect(platform.platform.id.toString()).toBe('analytics-platform');
    expect(platform.platform.displayName).toBe('Analytics Platform');
  });

  it('should set pricingTier parameter on platform', () => {
    expect(
      platform.platform.parameters.getOptionalFieldByName('pricingTier'),
    ).toBe('premium');
  });

  it('should create cluster with correct type', () => {
    expect(platform.clusters).toHaveLength(1);
    expect(platform.clusters[0].component.type.toString()).toBe(
      'BigData.PaaS.ComputeCluster',
    );
  });

  it('should create job with correct type', () => {
    expect(platform.jobs).toHaveLength(1);
    expect(platform.jobs[0].component.type.toString()).toBe(
      'BigData.PaaS.DataProcessingJob',
    );
  });

  it('should create experiment with correct type', () => {
    expect(platform.experiments).toHaveLength(1);
    expect(platform.experiments[0].component.type.toString()).toBe(
      'BigData.PaaS.MlExperiment',
    );
  });

  it('should auto-wire platform dependency into each child', () => {
    for (const cluster of platform.clusters) {
      const depIds = cluster.component.dependencies.map(d => d.id.toString());
      expect(depIds).toContain('analytics-platform');
    }
    for (const job of platform.jobs) {
      const depIds = job.component.dependencies.map(d => d.id.toString());
      expect(depIds).toContain('analytics-platform');
    }
    for (const experiment of platform.experiments) {
      const depIds = experiment.component.dependencies.map(d =>
        d.id.toString(),
      );
      expect(depIds).toContain('analytics-platform');
    }
  });

  it('should set cluster parameters', () => {
    const clusterComp = platform.clusters[0].component;
    expect(
      clusterComp.parameters.getOptionalFieldByName('clusterName'),
    ).toBe('main-spark');
    expect(
      clusterComp.parameters.getOptionalFieldByName('sparkVersion'),
    ).toBe('14.3.x-scala2.12');
    expect(
      clusterComp.parameters.getOptionalFieldByName('nodeTypeId'),
    ).toBe('i3.xlarge');
  });

  it('should set job parameters', () => {
    const jobComp = platform.jobs[0].component;
    expect(jobComp.parameters.getOptionalFieldByName('jobName')).toBe(
      'daily-etl',
    );
    expect(jobComp.parameters.getOptionalFieldByName('taskType')).toBe(
      'NOTEBOOK',
    );
    expect(jobComp.parameters.getOptionalFieldByName('notebookPath')).toBe(
      '/jobs/daily-etl',
    );
  });

  it('should set experiment parameters', () => {
    const expComp = platform.experiments[0].component;
    expect(
      expComp.parameters.getOptionalFieldByName('experimentName'),
    ).toBe('model-training');
  });
});

// ── AWS live system tests ───────────────────────────────────────────────────

describe('basic_big_data AWS live system', () => {
  it('should satisfy DistributedDataProcessing with AwsDatabricks', () => {
    const awsPlatform = AwsDatabricks.satisfy(platform.platform)
      .withCredentialsId('my-creds')
      .withStorageConfigurationId('my-storage')
      .withNetworkId('my-network')
      .build();

    expect(awsPlatform.type.toString()).toBe('BigData.PaaS.Databricks');
    expect(awsPlatform.provider).toBe('AWS');
    expect(awsPlatform.id.toString()).toBe('analytics-platform');
    expect(awsPlatform.displayName).toBe('Analytics Platform');
    // Blueprint param carried
    expect(
      awsPlatform.parameters.getOptionalFieldByName('pricingTier'),
    ).toBe('premium');
    // Vendor-specific params
    expect(
      awsPlatform.parameters.getOptionalFieldByName('credentialsId'),
    ).toBe('my-creds');
    expect(
      awsPlatform.parameters.getOptionalFieldByName(
        'storageConfigurationId',
      ),
    ).toBe('my-storage');
    expect(
      awsPlatform.parameters.getOptionalFieldByName('networkId'),
    ).toBe('my-network');
  });

  it('should satisfy ComputeCluster with AwsDatabricksCluster and carry params + deps', () => {
    const clusterBp = platform.clusters[0].component;
    const awsCluster = AwsDatabricksCluster.satisfy(clusterBp).build();

    expect(awsCluster.type.toString()).toBe(
      'BigData.PaaS.DatabricksCluster',
    );
    expect(awsCluster.provider).toBe('AWS');
    expect(awsCluster.id.toString()).toBe('spark-cluster');
    expect(awsCluster.displayName).toBe('Spark Cluster');

    // Platform dependency carried from blueprint
    const depIds = awsCluster.dependencies.map(d => d.id.toString());
    expect(depIds).toContain('analytics-platform');

    // Blueprint params carried
    expect(
      awsCluster.parameters.getOptionalFieldByName('clusterName'),
    ).toBe('main-spark');
    expect(
      awsCluster.parameters.getOptionalFieldByName('sparkVersion'),
    ).toBe('14.3.x-scala2.12');
    expect(
      awsCluster.parameters.getOptionalFieldByName('nodeTypeId'),
    ).toBe('i3.xlarge');
  });

  it('should satisfy DataProcessingJob with AwsDatabricksJob and carry deps', () => {
    const jobBp = platform.jobs[0].component;
    const awsJob = AwsDatabricksJob.satisfy(jobBp).build();

    expect(awsJob.type.toString()).toBe('BigData.PaaS.DatabricksJob');
    expect(awsJob.provider).toBe('AWS');
    expect(awsJob.id.toString()).toBe('etl-job');

    // Platform dependency carried from blueprint
    const depIds = awsJob.dependencies.map(d => d.id.toString());
    expect(depIds).toContain('analytics-platform');

    // Blueprint params carried
    expect(awsJob.parameters.getOptionalFieldByName('jobName')).toBe(
      'daily-etl',
    );
    expect(awsJob.parameters.getOptionalFieldByName('taskType')).toBe(
      'NOTEBOOK',
    );
  });

  it('should satisfy MlExperiment with AwsDatabricksMlflow and carry deps', () => {
    const expBp = platform.experiments[0].component;
    const awsMlflow = AwsDatabricksMlflow.satisfy(expBp).build();

    expect(awsMlflow.type.toString()).toBe(
      'BigData.PaaS.DatabricksMlflowExperiment',
    );
    expect(awsMlflow.provider).toBe('AWS');
    expect(awsMlflow.id.toString()).toBe('training-exp');

    // Platform dependency carried from blueprint
    const depIds = awsMlflow.dependencies.map(d => d.id.toString());
    expect(depIds).toContain('analytics-platform');

    // Blueprint params carried
    expect(
      awsMlflow.parameters.getOptionalFieldByName('experimentName'),
    ).toBe('model-training');
  });
});

// ── Azure live system tests ─────────────────────────────────────────────────

describe('basic_big_data Azure live system', () => {
  it('should satisfy DistributedDataProcessing with AzureDatabricks', () => {
    const azurePlatform = AzureDatabricks.satisfy(platform.platform)
      .withManagedResourceGroupName('my-managed-rg')
      .withEnableNoPublicIp(true)
      .build();

    expect(azurePlatform.type.toString()).toBe('BigData.PaaS.Databricks');
    expect(azurePlatform.provider).toBe('Azure');
    expect(azurePlatform.id.toString()).toBe('analytics-platform');
    expect(azurePlatform.displayName).toBe('Analytics Platform');
    // Blueprint param carried
    expect(
      azurePlatform.parameters.getOptionalFieldByName('pricingTier'),
    ).toBe('premium');
    // Vendor-specific params
    expect(
      azurePlatform.parameters.getOptionalFieldByName(
        'managedResourceGroupName',
      ),
    ).toBe('my-managed-rg');
    expect(
      azurePlatform.parameters.getOptionalFieldByName('enableNoPublicIp'),
    ).toBe(true);
  });

  it('should satisfy ComputeCluster with AzureDatabricksCluster and carry deps', () => {
    const clusterBp = platform.clusters[0].component;
    const azureCluster = AzureDatabricksCluster.satisfy(clusterBp).build();

    expect(azureCluster.type.toString()).toBe(
      'BigData.PaaS.DatabricksCluster',
    );
    expect(azureCluster.provider).toBe('Azure');
    expect(azureCluster.id.toString()).toBe('spark-cluster');

    // Platform dependency carried from blueprint
    const depIds = azureCluster.dependencies.map(d => d.id.toString());
    expect(depIds).toContain('analytics-platform');
  });

  it('should satisfy DataProcessingJob with AzureDatabricksJob and carry deps', () => {
    const jobBp = platform.jobs[0].component;
    const azureJob = AzureDatabricksJob.satisfy(jobBp).build();

    expect(azureJob.type.toString()).toBe('BigData.PaaS.DatabricksJob');
    expect(azureJob.provider).toBe('Azure');

    const depIds = azureJob.dependencies.map(d => d.id.toString());
    expect(depIds).toContain('analytics-platform');
  });

  it('should satisfy MlExperiment with AzureDatabricksMlflow and carry deps', () => {
    const expBp = platform.experiments[0].component;
    const azureMlflow = AzureDatabricksMlflow.satisfy(expBp).build();

    expect(azureMlflow.type.toString()).toBe(
      'BigData.PaaS.DatabricksMlflowExperiment',
    );
    expect(azureMlflow.provider).toBe('Azure');

    const depIds = azureMlflow.dependencies.map(d => d.id.toString());
    expect(depIds).toContain('analytics-platform');
  });
});

// ── GCP live system tests ───────────────────────────────────────────────────

describe('basic_big_data GCP live system', () => {
  it('should satisfy DistributedDataProcessing with GcpDatabricks', () => {
    const gcpPlatform = GcpDatabricks.satisfy(platform.platform)
      .withNetworkId('my-gcp-network')
      .build();

    expect(gcpPlatform.type.toString()).toBe('BigData.PaaS.Databricks');
    expect(gcpPlatform.provider).toBe('GCP');
    expect(gcpPlatform.id.toString()).toBe('analytics-platform');
    expect(gcpPlatform.displayName).toBe('Analytics Platform');
    // Blueprint param carried
    expect(
      gcpPlatform.parameters.getOptionalFieldByName('pricingTier'),
    ).toBe('premium');
    // Vendor-specific param
    expect(
      gcpPlatform.parameters.getOptionalFieldByName('networkId'),
    ).toBe('my-gcp-network');
  });

  it('should satisfy ComputeCluster with GcpDatabricksCluster and carry deps', () => {
    const clusterBp = platform.clusters[0].component;
    const gcpCluster = GcpDatabricksCluster.satisfy(clusterBp).build();

    expect(gcpCluster.type.toString()).toBe(
      'BigData.PaaS.DatabricksCluster',
    );
    expect(gcpCluster.provider).toBe('GCP');
    expect(gcpCluster.id.toString()).toBe('spark-cluster');

    // Platform dependency carried from blueprint
    const depIds = gcpCluster.dependencies.map(d => d.id.toString());
    expect(depIds).toContain('analytics-platform');
  });

  it('should satisfy DataProcessingJob with GcpDatabricksJob and carry deps', () => {
    const jobBp = platform.jobs[0].component;
    const gcpJob = GcpDatabricksJob.satisfy(jobBp).build();

    expect(gcpJob.type.toString()).toBe('BigData.PaaS.DatabricksJob');
    expect(gcpJob.provider).toBe('GCP');

    const depIds = gcpJob.dependencies.map(d => d.id.toString());
    expect(depIds).toContain('analytics-platform');
  });

  it('should satisfy MlExperiment with GcpDatabricksMlflow and carry deps', () => {
    const expBp = platform.experiments[0].component;
    const gcpMlflow = GcpDatabricksMlflow.satisfy(expBp).build();

    expect(gcpMlflow.type.toString()).toBe(
      'BigData.PaaS.DatabricksMlflowExperiment',
    );
    expect(gcpMlflow.provider).toBe('GCP');

    const depIds = gcpMlflow.dependencies.map(d => d.id.toString());
    expect(depIds).toContain('analytics-platform');
  });
});
