import {describe, expect, it} from 'vitest';
import {ContainerPlatform} from './container_platform';
import {Workload} from '../../custom_workloads/caas/workload';

const BASE_CONFIG = {
  id: 'my-cluster',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Cluster',
};

const workloadConfig = {
  version: {major: 1, minor: 0, patch: 0},
  containerImage: 'nginx:latest',
};

describe('ContainerPlatform', () => {
  describe('create()', () => {
    it('should build a node with the correct type string', () => {
      const node = ContainerPlatform.create(BASE_CONFIG);
      expect(node.platform.type.toString()).toBe(
        'NetworkAndCompute.PaaS.ContainerPlatform',
      );
    });

    it('should set id and displayName', () => {
      const node = ContainerPlatform.create(BASE_CONFIG);
      expect(node.platform.id.toString()).toBe('my-cluster');
      expect(node.platform.displayName).toBe('My Cluster');
    });

    it('should set description when provided', () => {
      const node = ContainerPlatform.create({
        ...BASE_CONFIG,
        description: 'Hosts all container workloads',
      });
      expect(node.platform.description).toBe('Hosts all container workloads');
    });

    it('should set nodePools parameter', () => {
      const node = ContainerPlatform.create({
        ...BASE_CONFIG,
        nodePools: [{name: 'default', minNodeCount: 1, maxNodeCount: 3}],
      });
      expect(
        node.platform.parameters.getOptionalFieldByName('nodePools'),
      ).toEqual([{name: 'default', minNodeCount: 1, maxNodeCount: 3}]);
    });

    it('should start with no workloads', () => {
      const node = ContainerPlatform.create(BASE_CONFIG);
      expect(node.workloads).toHaveLength(0);
    });
  });

  describe('withWorkloads()', () => {
    it('should auto-wire the platform as a dependency of each workload', () => {
      const w1 = Workload.create({
        id: 'web-workload',
        displayName: 'Web',
        ...workloadConfig,
      });
      const w2 = Workload.create({
        id: 'api-workload',
        displayName: 'API',
        ...workloadConfig,
      });

      const node = ContainerPlatform.create(BASE_CONFIG).withWorkloads([
        w1,
        w2,
      ]);

      expect(node.workloads).toHaveLength(2);
      for (const wired of node.workloads) {
        const depIds = wired.component.dependencies.map(d => d.id.toString());
        expect(depIds).toContain('my-cluster');
      }
    });

    it('should preserve existing workload dependencies when stacking cluster dep', () => {
      const subnetDep = {
        id: {toString: () => 'private-subnet'} as never,
      };
      const w = Workload.create({
        id: 'web-workload',
        displayName: 'Web',
        ...workloadConfig,
      });
      // Simulate a workload that already has a subnet dep
      const wWithSubnet = {
        ...w,
        component: {
          ...w.component,
          dependencies: [subnetDep],
        },
      };

      const node = ContainerPlatform.create(BASE_CONFIG).withWorkloads([
        wWithSubnet,
      ]);
      const depIds = node.workloads[0].component.dependencies.map(d =>
        d.id.toString(),
      );
      expect(depIds).toContain('private-subnet');
      expect(depIds).toContain('my-cluster');
    });

    it('should be immutable — withWorkloads returns a new node', () => {
      const w = Workload.create({
        id: 'web-workload',
        displayName: 'Web',
        ...workloadConfig,
      });
      const original = ContainerPlatform.create(BASE_CONFIG);
      const withWorkloads = original.withWorkloads([w]);
      expect(original.workloads).toHaveLength(0);
      expect(withWorkloads.workloads).toHaveLength(1);
    });
  });

  describe('getBuilder()', () => {
    it('should build a component via fluent builder', () => {
      const c = ContainerPlatform.getBuilder()
        .withId('platform-b')
        .withVersion(2, 0, 0)
        .withDisplayName('Platform B')
        .build();
      expect(c.type.toString()).toBe('NetworkAndCompute.PaaS.ContainerPlatform');
      expect(c.id.toString()).toBe('platform-b');
      expect(c.version.major).toBe(2);
    });
  });
});
