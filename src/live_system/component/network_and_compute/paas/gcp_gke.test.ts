import {describe, expect, it} from 'vitest';
import {GcpGkeCluster} from './gcp_gke';
import {ContainerPlatform} from '../../../../fractal/component/network_and_compute/paas/container_platform';

const BASE_CONFIG = {
  id: 'my-cluster',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Cluster',
};

describe('GcpGkeCluster', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpGkeCluster.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.PaaS.Kubernetes');
    });

    it('should set provider to GCP', () => {
      const c = GcpGkeCluster.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should set id and displayName', () => {
      const c = GcpGkeCluster.create({
        ...BASE_CONFIG,
        description: 'My GKE cluster',
      });
      expect(c.id.toString()).toBe('my-cluster');
      expect(c.displayName).toBe('My Cluster');
      expect(c.description).toBe('My GKE cluster');
    });

    it('should set vendor-specific params when provided', () => {
      const c = GcpGkeCluster.create({
        ...BASE_CONFIG,
        kubernetesVersion: '1.28',
        networkName: 'my-vpc',
        subnetworkName: 'my-subnet',
        subnetworkIpRange: '10.0.0.0/20',
        serviceIpRange: '10.1.0.0/20',
        podIpRange: '10.2.0.0/14',
        podsRangeName: 'pods',
        servicesRangeName: 'services',
        nodePools: [{name: 'default', machineType: 'e2-standard-4'}],
        workloadIdentityEnabled: true,
        privateClusterDisabled: false,
        networkPolicyProvider: 'calico',
        masterIpv4CidrBlock: '172.16.0.0/28',
        priorityClasses: [{name: 'high', value: 1000}],
        roles: [{name: 'admin'}],
      });
      expect(c.parameters.getOptionalFieldByName('kubernetesVersion')).toBe(
        '1.28',
      );
      expect(c.parameters.getOptionalFieldByName('networkName')).toBe(
        'my-vpc',
      );
      expect(c.parameters.getOptionalFieldByName('subnetworkName')).toBe(
        'my-subnet',
      );
      expect(c.parameters.getOptionalFieldByName('subnetworkIpRange')).toBe(
        '10.0.0.0/20',
      );
      expect(c.parameters.getOptionalFieldByName('serviceIpRange')).toBe(
        '10.1.0.0/20',
      );
      expect(c.parameters.getOptionalFieldByName('podIpRange')).toBe(
        '10.2.0.0/14',
      );
      expect(c.parameters.getOptionalFieldByName('podsRangeName')).toBe(
        'pods',
      );
      expect(c.parameters.getOptionalFieldByName('servicesRangeName')).toBe(
        'services',
      );
      expect(
        c.parameters.getOptionalFieldByName('workloadIdentityEnabled'),
      ).toBe(true);
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

      const c = GcpGkeCluster.satisfy(platform.platform).build();
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
      const c = GcpGkeCluster.satisfy(platform.platform).build();
      expect(c.type.toString()).toBe('NetworkAndCompute.PaaS.Kubernetes');
    });

    it('should allow setting vendor-specific params via sealed builder', () => {
      const platform = ContainerPlatform.create({
        id: 'test-cluster',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Test Cluster',
      });

      const c = GcpGkeCluster.satisfy(platform.platform)
        .withKubernetesVersion('1.28')
        .withNetworkName('my-vpc')
        .withSubnetworkName('my-subnet')
        .withSubnetworkIpRange('10.0.0.0/20')
        .withServiceIpRange('10.1.0.0/20')
        .withPodIpRange('10.2.0.0/14')
        .withPodsRangeName('pods')
        .withServicesRangeName('services')
        .withNodePools([{name: 'default'}])
        .withWorkloadIdentityEnabled(true)
        .withPrivateClusterDisabled(false)
        .withNetworkPolicyProvider('calico')
        .withMasterIpv4CidrBlock('172.16.0.0/28')
        .withPriorityClasses([{name: 'high'}])
        .withRoles([{name: 'admin'}])
        .build();

      expect(c.parameters.getOptionalFieldByName('kubernetesVersion')).toBe(
        '1.28',
      );
      expect(c.parameters.getOptionalFieldByName('networkName')).toBe(
        'my-vpc',
      );
      expect(
        c.parameters.getOptionalFieldByName('workloadIdentityEnabled'),
      ).toBe(true);
    });
  });

  describe('getBuilder()', () => {
    it('should build a cluster via fluent builder', () => {
      const c = GcpGkeCluster.getBuilder()
        .withId('cluster-b')
        .withVersion(2, 0, 0)
        .withDisplayName('Cluster B')
        .build();
      expect(c.type.toString()).toBe('NetworkAndCompute.PaaS.Kubernetes');
      expect(c.id.toString()).toBe('cluster-b');
      expect(c.version.major).toBe(2);
    });
  });
});
