import {describe, expect, it} from 'vitest';
import {AzureDatabricksCluster} from './azure_databricks_cluster';
import {ComputeCluster} from '../../../../fractal/component/big_data/paas/compute_cluster';

const BASE_CONFIG = {
  id: 'my-cluster',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Cluster',
};

describe('AzureDatabricksCluster', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureDatabricksCluster.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('BigData.PaaS.DatabricksCluster');
    });

    it('should set provider to Azure', () => {
      const c = AzureDatabricksCluster.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set id and displayName', () => {
      const c = AzureDatabricksCluster.create({
        ...BASE_CONFIG,
        description: 'A cluster',
      });
      expect(c.id.toString()).toBe('my-cluster');
      expect(c.displayName).toBe('My Cluster');
      expect(c.description).toBe('A cluster');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = ComputeCluster.create({
        id: 'bp-cluster',
        version: {major: 2, minor: 1, patch: 0},
        displayName: 'Blueprint Cluster',
        description: 'A compute cluster',
        clusterName: 'test-cluster',
        sparkVersion: '13.3.x-scala2.12',
      });

      const c = AzureDatabricksCluster.satisfy(bp.component).build();
      expect(c.id.toString()).toBe('bp-cluster');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.displayName).toBe('Blueprint Cluster');
      expect(c.description).toBe('A compute cluster');
    });

    it('should carry blueprint params (clusterName, sparkVersion)', () => {
      const bp = ComputeCluster.create({
        id: 'bp-cluster',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Cluster',
        clusterName: 'my-spark-cluster',
        sparkVersion: '14.0.x-scala2.12',
        numWorkers: 4,
      });

      const c = AzureDatabricksCluster.satisfy(bp.component).build();
      expect(c.parameters.getOptionalFieldByName('clusterName')).toBe(
        'my-spark-cluster',
      );
      expect(c.parameters.getOptionalFieldByName('sparkVersion')).toBe(
        '14.0.x-scala2.12',
      );
      expect(c.parameters.getOptionalFieldByName('numWorkers')).toBe(4);
    });

    it('should set nodeTypeId via satisfied builder', () => {
      const bp = ComputeCluster.create({
        id: 'bp-cluster',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Cluster',
      });

      const c = AzureDatabricksCluster.satisfy(bp.component)
        .withNodeTypeId('Standard_DS4_v2')
        .build();
      expect(c.parameters.getOptionalFieldByName('nodeTypeId')).toBe(
        'Standard_DS4_v2',
      );
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = ComputeCluster.create({
        id: 'bp-cluster',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Cluster',
        clusterName: 'c',
        sparkVersion: 's',
      });

      const c = AzureDatabricksCluster.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
