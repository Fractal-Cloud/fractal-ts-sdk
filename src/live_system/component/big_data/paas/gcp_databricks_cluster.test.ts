import {describe, expect, it} from 'vitest';
import {GcpDatabricksCluster} from './gcp_databricks_cluster';
import {ComputeCluster} from '../../../../fractal/component/big_data/paas/compute_cluster';

const BASE_CONFIG = {
  id: 'my-cluster',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Cluster',
};

describe('GcpDatabricksCluster', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpDatabricksCluster.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('BigData.PaaS.DatabricksCluster');
    });

    it('should set provider to GCP', () => {
      const c = GcpDatabricksCluster.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {component: blueprint} = ComputeCluster.create({
        id: 'bp-cluster',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Cluster',
        clusterName: 'test-cluster',
        sparkVersion: '13.3.x-scala2.12',
      });

      const c = GcpDatabricksCluster.satisfy(blueprint).build();

      expect(c.id.toString()).toBe('bp-cluster');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Cluster');
    });

    it('should carry clusterName, sparkVersion from blueprint', () => {
      const {component: blueprint} = ComputeCluster.create({
        id: 'bp-cluster',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Cluster',
        clusterName: 'my-spark-cluster',
        sparkVersion: '13.3.x-scala2.12',
      });

      const c = GcpDatabricksCluster.satisfy(blueprint).build();
      expect(c.parameters.getOptionalFieldByName('clusterName')).toBe(
        'my-spark-cluster'
      );
      expect(c.parameters.getOptionalFieldByName('sparkVersion')).toBe(
        '13.3.x-scala2.12'
      );
    });

    it('should set nodeTypeId via satisfied builder', () => {
      const {component: blueprint} = ComputeCluster.create({
        id: 'bp-cluster',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Cluster',
      });

      const c = GcpDatabricksCluster.satisfy(blueprint)
        .withNodeTypeId('n1-standard-4')
        .build();
      expect(c.parameters.getOptionalFieldByName('nodeTypeId')).toBe(
        'n1-standard-4'
      );
    });

    it('should set dataSecurityMode via satisfied builder', () => {
      const {component: blueprint} = ComputeCluster.create({
        id: 'bp-cluster',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Cluster',
      });

      const c = GcpDatabricksCluster.satisfy(blueprint)
        .withDataSecurityMode('SINGLE_USER')
        .build();
      expect(c.parameters.getOptionalFieldByName('dataSecurityMode')).toBe(
        'SINGLE_USER'
      );
    });

    it('should carry dependencies and links from blueprint', () => {
      const {component: blueprint} = ComputeCluster.create({
        id: 'bp-cluster',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Cluster',
        clusterName: 'test',
        sparkVersion: '13.3.x-scala2.12',
      });

      const c = GcpDatabricksCluster.satisfy(blueprint).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
