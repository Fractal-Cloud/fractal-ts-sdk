import {describe, expect, it} from 'vitest';
import {AwsEcsCluster} from './ecs_cluster';
import {ContainerPlatform} from '../../../../fractal/component/network_and_compute/paas/container_platform';

const BASE_CONFIG = {
  id: 'my-cluster',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Cluster',
};

describe('AwsEcsCluster', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AwsEcsCluster.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.PaaS.ECS');
    });

    it('should set provider to AWS', () => {
      const c = AwsEcsCluster.create(BASE_CONFIG);
      expect(c.provider).toBe('AWS');
    });

    it('should set id and displayName', () => {
      const c = AwsEcsCluster.create({
        ...BASE_CONFIG,
        description: 'My ECS cluster',
      });
      expect(c.id.toString()).toBe('my-cluster');
      expect(c.displayName).toBe('My Cluster');
      expect(c.description).toBe('My ECS cluster');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, and displayName from blueprint', () => {
      const platform = ContainerPlatform.create({
        id: 'bp-cluster',
        version: {major: 2, minor: 1, patch: 0},
        displayName: 'Blueprint Cluster',
        description: 'A container platform',
      });

      const c = AwsEcsCluster.satisfy(platform.platform).build();
      expect(c.id.toString()).toBe('bp-cluster');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.displayName).toBe('Blueprint Cluster');
      expect(c.description).toBe('A container platform');
    });

    it('should set the correct type string', () => {
      const platform = ContainerPlatform.create({
        id: 'test-cluster',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Test Cluster',
      });
      const c = AwsEcsCluster.satisfy(platform.platform).build();
      expect(c.type.toString()).toBe('NetworkAndCompute.PaaS.ECS');
    });
  });

  describe('getBuilder()', () => {
    it('should build a cluster via fluent builder', () => {
      const c = AwsEcsCluster.getBuilder()
        .withId('cluster-b')
        .withVersion(2, 0, 0)
        .withDisplayName('Cluster B')
        .build();
      expect(c.type.toString()).toBe('NetworkAndCompute.PaaS.ECS');
      expect(c.id.toString()).toBe('cluster-b');
      expect(c.version.major).toBe(2);
    });
  });
});
