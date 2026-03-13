import {describe, expect, it} from 'vitest';
import {AwsDatabricksCluster} from './aws_databricks_cluster';
import {ComputeCluster} from '../../../../fractal/component/big_data/paas/compute_cluster';

const BASE_CONFIG = {
  id: 'my-cluster',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Cluster',
};

describe('AwsDatabricksCluster', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AwsDatabricksCluster.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('BigData.PaaS.DatabricksCluster');
    });

    it('should set provider to AWS', () => {
      const c = AwsDatabricksCluster.create(BASE_CONFIG);
      expect(c.provider).toBe('AWS');
    });

    it('should set cluster parameters', () => {
      const c = AwsDatabricksCluster.create({
        ...BASE_CONFIG,
        clusterName: 'test-cluster',
        sparkVersion: '14.3.x-scala2.12',
        nodeTypeId: 'i3.xlarge',
        numWorkers: 4,
        autoTerminationMinutes: 120,
      });
      expect(c.parameters.getOptionalFieldByName('clusterName')).toBe(
        'test-cluster'
      );
      expect(c.parameters.getOptionalFieldByName('sparkVersion')).toBe(
        '14.3.x-scala2.12'
      );
      expect(c.parameters.getOptionalFieldByName('nodeTypeId')).toBe(
        'i3.xlarge'
      );
      expect(c.parameters.getOptionalFieldByName('numWorkers')).toBe(4);
      expect(
        c.parameters.getOptionalFieldByName('autoTerminationMinutes')
      ).toBe(120);
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = ComputeCluster.create({
        id: 'bp-cluster',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Cluster',
      });

      const c = AwsDatabricksCluster.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-cluster');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Cluster');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = ComputeCluster.create({
        id: 'bp-cluster',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Cluster',
      });

      const c = AwsDatabricksCluster.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should carry blueprint params', () => {
      const bp = ComputeCluster.create({
        id: 'my-cluster',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'My Cluster',
        clusterName: 'test-cluster',
        sparkVersion: '14.3.x-scala2.12',
      });
      const c = AwsDatabricksCluster.satisfy(bp.component).build();
      expect(c.parameters.getOptionalFieldByName('clusterName')).toBe(
        'test-cluster'
      );
      expect(c.parameters.getOptionalFieldByName('sparkVersion')).toBe(
        '14.3.x-scala2.12'
      );
    });

    it('should set nodeTypeId via satisfied builder', () => {
      const bp = ComputeCluster.create({
        id: 'my-cluster',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'My Cluster',
      });
      const c = AwsDatabricksCluster.satisfy(bp.component)
        .withNodeTypeId('i3.xlarge')
        .build();
      expect(c.parameters.getOptionalFieldByName('nodeTypeId')).toBe(
        'i3.xlarge'
      );
    });
  });
});
