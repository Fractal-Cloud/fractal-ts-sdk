import {describe, expect, it} from 'vitest';
import {ComputeCluster} from './compute_cluster';

const BASE_CONFIG = {
  id: 'my-cluster',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Cluster',
  clusterName: 'test-cluster',
  sparkVersion: '13.3',
};

describe('ComputeCluster (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = ComputeCluster.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('BigData.PaaS.ComputeCluster');
    });

    it('should set id, version, and displayName', () => {
      const {component} = ComputeCluster.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-cluster');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Cluster');
    });

    it('should set description when provided', () => {
      const {component} = ComputeCluster.create({
        ...BASE_CONFIG,
        description: 'Production cluster',
      });
      expect(component.description).toBe('Production cluster');
    });

    it('should not set description when omitted', () => {
      const {component} = ComputeCluster.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });

    it('should set required parameters', () => {
      const {component} = ComputeCluster.create(BASE_CONFIG);
      expect(
        component.parameters.getOptionalFieldByName('clusterName'),
      ).toBe('test-cluster');
      expect(
        component.parameters.getOptionalFieldByName('sparkVersion'),
      ).toBe('13.3');
    });

    it('should set optional parameters when provided', () => {
      const {component} = ComputeCluster.create({
        ...BASE_CONFIG,
        numWorkers: 4,
        minWorkers: 2,
        maxWorkers: 8,
        autoTerminationMinutes: 30,
      });
      expect(component.parameters.getOptionalFieldByName('numWorkers')).toBe(
        4,
      );
      expect(component.parameters.getOptionalFieldByName('minWorkers')).toBe(
        2,
      );
      expect(component.parameters.getOptionalFieldByName('maxWorkers')).toBe(
        8,
      );
      expect(
        component.parameters.getOptionalFieldByName('autoTerminationMinutes'),
      ).toBe(30);
    });

    it('should set sparkConf, pypiLibraries, and mavenLibraries', () => {
      const sparkConf = {'spark.executor.memory': '4g'};
      const {component} = ComputeCluster.create({
        ...BASE_CONFIG,
        sparkConf,
        pypiLibraries: ['pandas', 'numpy'],
        mavenLibraries: ['com.databricks:spark-xml_2.12:0.14.0'],
      });
      expect(
        component.parameters.getOptionalFieldByName('sparkConf'),
      ).toEqual(sparkConf);
      expect(
        component.parameters.getOptionalFieldByName('pypiLibraries'),
      ).toEqual(['pandas', 'numpy']);
      expect(
        component.parameters.getOptionalFieldByName('mavenLibraries'),
      ).toEqual(['com.databricks:spark-xml_2.12:0.14.0']);
    });

    it('should not set optional parameters when omitted', () => {
      const {component} = ComputeCluster.create(BASE_CONFIG);
      expect(
        component.parameters.getOptionalFieldByName('numWorkers'),
      ).toBeNull();
      expect(
        component.parameters.getOptionalFieldByName('sparkConf'),
      ).toBeNull();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = ComputeCluster.getBuilder()
        .withId('cluster-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Cluster A')
        .withClusterName('cluster-a-name')
        .withSparkVersion('14.0')
        .build();

      expect(c.type.toString()).toBe('BigData.PaaS.ComputeCluster');
      expect(c.id.toString()).toBe('cluster-a');
    });
  });
});
