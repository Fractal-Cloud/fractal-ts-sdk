import {describe, expect, it} from 'vitest';
import {AwsEksCluster} from './eks_cluster';
import {ContainerPlatform} from '../../../../fractal/component/network_and_compute/paas/container_platform';

const BASE_CONFIG = {
  id: 'my-cluster',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Cluster',
};

describe('AwsEksCluster', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AwsEksCluster.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.PaaS.Kubernetes');
    });

    it('should set provider to AWS', () => {
      const c = AwsEksCluster.create(BASE_CONFIG);
      expect(c.provider).toBe('AWS');
    });

    it('should set id and displayName', () => {
      const c = AwsEksCluster.create({
        ...BASE_CONFIG,
        description: 'My EKS cluster',
      });
      expect(c.id.toString()).toBe('my-cluster');
      expect(c.displayName).toBe('My Cluster');
      expect(c.description).toBe('My EKS cluster');
    });

    it('should set vendor-specific params when provided', () => {
      const c = AwsEksCluster.create({
        ...BASE_CONFIG,
        kubernetesVersion: '1.28',
        vpcCidrBlock: '10.0.0.0/16',
        privateSubnetCidrs: ['10.0.1.0/24', '10.0.2.0/24'],
        desiredAvailabilityZoneCount: 3,
        nodePools: [{name: 'default', instanceType: 'm5.large'}],
        addons: [{name: 'vpc-cni'}],
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
      expect(c.parameters.getOptionalFieldByName('vpcCidrBlock')).toBe(
        '10.0.0.0/16',
      );
      expect(c.parameters.getOptionalFieldByName('privateSubnetCidrs')).toEqual(
        ['10.0.1.0/24', '10.0.2.0/24'],
      );
      expect(
        c.parameters.getOptionalFieldByName('desiredAvailabilityZoneCount'),
      ).toBe(3);
      expect(c.parameters.getOptionalFieldByName('nodePools')).toEqual([
        {name: 'default', instanceType: 'm5.large'},
      ]);
      expect(c.parameters.getOptionalFieldByName('addons')).toEqual([
        {name: 'vpc-cni'},
      ]);
      expect(
        c.parameters.getOptionalFieldByName('workloadIdentityEnabled'),
      ).toBe(true);
      expect(
        c.parameters.getOptionalFieldByName('privateClusterDisabled'),
      ).toBe(false);
      expect(
        c.parameters.getOptionalFieldByName('networkPolicyProvider'),
      ).toBe('calico');
      expect(
        c.parameters.getOptionalFieldByName('masterIpv4CidrBlock'),
      ).toBe('172.16.0.0/28');
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

      const c = AwsEksCluster.satisfy(platform.platform).build();
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
      const c = AwsEksCluster.satisfy(platform.platform).build();
      expect(c.type.toString()).toBe('NetworkAndCompute.PaaS.Kubernetes');
    });

    it('should allow setting vendor-specific params via sealed builder', () => {
      const platform = ContainerPlatform.create({
        id: 'test-cluster',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Test Cluster',
      });

      const c = AwsEksCluster.satisfy(platform.platform)
        .withKubernetesVersion('1.28')
        .withVpcCidrBlock('10.0.0.0/16')
        .withPrivateSubnetCidrs(['10.0.1.0/24'])
        .withDesiredAvailabilityZoneCount(2)
        .withNodePools([{name: 'default'}])
        .withAddons([{name: 'vpc-cni'}])
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
      expect(c.parameters.getOptionalFieldByName('vpcCidrBlock')).toBe(
        '10.0.0.0/16',
      );
      expect(
        c.parameters.getOptionalFieldByName('workloadIdentityEnabled'),
      ).toBe(true);
    });
  });

  describe('getBuilder()', () => {
    it('should build a cluster via fluent builder', () => {
      const c = AwsEksCluster.getBuilder()
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
