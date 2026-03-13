import {describe, expect, it} from 'vitest';
import {DistributedDataProcessing} from './distributed_data_processing';
import {ComputeCluster} from './compute_cluster';
import {DataProcessingJob} from './data_processing_job';
import {MlExperiment} from './ml_experiment';

const BASE_CONFIG = {
  id: 'my-platform',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Platform',
};

describe('DistributedDataProcessing', () => {
  describe('create()', () => {
    it('should build with correct type string', () => {
      const node = DistributedDataProcessing.create(BASE_CONFIG);
      expect(node.platform.type.toString()).toBe(
        'BigData.PaaS.DistributedDataProcessing',
      );
    });

    it('should set id and displayName', () => {
      const node = DistributedDataProcessing.create(BASE_CONFIG);
      expect(node.platform.id.toString()).toBe('my-platform');
      expect(node.platform.displayName).toBe('My Platform');
    });

    it('should set description when provided', () => {
      const node = DistributedDataProcessing.create({
        ...BASE_CONFIG,
        description: 'Databricks workspace',
      });
      expect(node.platform.description).toBe('Databricks workspace');
    });

    it('should set pricingTier parameter', () => {
      const node = DistributedDataProcessing.create({
        ...BASE_CONFIG,
        pricingTier: 'premium',
      });
      expect(
        node.platform.parameters.getOptionalFieldByName('pricingTier'),
      ).toBe('premium');
    });

    it('should start with no children', () => {
      const node = DistributedDataProcessing.create(BASE_CONFIG);
      expect(node.clusters).toHaveLength(0);
      expect(node.jobs).toHaveLength(0);
      expect(node.experiments).toHaveLength(0);
    });
  });

  describe('withClusters()', () => {
    it('should auto-wire the platform as a dependency of each cluster', () => {
      const cluster = ComputeCluster.create({
        id: 'my-cluster',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'My Cluster',
        clusterName: 'test-cluster',
        sparkVersion: '13.3',
        nodeTypeId: 'i3.xlarge',
      });

      const node = DistributedDataProcessing.create(BASE_CONFIG).withClusters([
        cluster,
      ]);

      expect(node.clusters).toHaveLength(1);
      const depIds = node.clusters[0].component.dependencies.map(d =>
        d.id.toString(),
      );
      expect(depIds).toContain('my-platform');
    });

    it('should be immutable', () => {
      const cluster = ComputeCluster.create({
        id: 'my-cluster',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'My Cluster',
        clusterName: 'test-cluster',
        sparkVersion: '13.3',
        nodeTypeId: 'i3.xlarge',
      });
      const original = DistributedDataProcessing.create(BASE_CONFIG);
      const withClusters = original.withClusters([cluster]);
      expect(original.clusters).toHaveLength(0);
      expect(withClusters.clusters).toHaveLength(1);
    });
  });

  describe('withJobs()', () => {
    it('should auto-wire the platform as a dependency of each job', () => {
      const job = DataProcessingJob.create({
        id: 'my-job',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'My Job',
        jobName: 'etl-job',
        taskType: 'notebook',
      });

      const node = DistributedDataProcessing.create(BASE_CONFIG).withJobs([
        job,
      ]);

      expect(node.jobs).toHaveLength(1);
      const depIds = node.jobs[0].component.dependencies.map(d =>
        d.id.toString(),
      );
      expect(depIds).toContain('my-platform');
    });
  });

  describe('withExperiments()', () => {
    it('should auto-wire the platform as a dependency of each experiment', () => {
      const experiment = MlExperiment.create({
        id: 'my-experiment',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'My Experiment',
      });

      const node =
        DistributedDataProcessing.create(BASE_CONFIG).withExperiments([
          experiment,
        ]);

      expect(node.experiments).toHaveLength(1);
      const depIds = node.experiments[0].component.dependencies.map(d =>
        d.id.toString(),
      );
      expect(depIds).toContain('my-platform');
    });
  });

  describe('getBuilder()', () => {
    it('should build via fluent builder', () => {
      const c = DistributedDataProcessing.getBuilder()
        .withId('platform-b')
        .withVersion(2, 0, 0)
        .withDisplayName('Platform B')
        .build();
      expect(c.type.toString()).toBe(
        'BigData.PaaS.DistributedDataProcessing',
      );
      expect(c.id.toString()).toBe('platform-b');
    });
  });
});
