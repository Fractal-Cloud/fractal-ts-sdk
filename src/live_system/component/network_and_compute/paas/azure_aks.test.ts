import {describe, expect, it} from 'vitest';
import {AzureAksCluster} from './azure_aks';
import {ContainerPlatform} from '../../../../fractal/component/network_and_compute/paas/container_platform';

const BASE_CONFIG = {
  id: 'my-cluster',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Cluster',
};

describe('AzureAksCluster', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureAksCluster.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.PaaS.Kubernetes');
    });

    it('should set provider to Azure', () => {
      const c = AzureAksCluster.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set id and displayName', () => {
      const c = AzureAksCluster.create({
        ...BASE_CONFIG,
        description: 'My AKS cluster',
      });
      expect(c.id.toString()).toBe('my-cluster');
      expect(c.displayName).toBe('My Cluster');
      expect(c.description).toBe('My AKS cluster');
    });

    it('should set vendor-specific params when provided', () => {
      const c = AzureAksCluster.create({
        ...BASE_CONFIG,
        kubernetesVersion: '1.28',
        vnetSubnetAddressIpRange: '10.0.0.0/16',
        managedClusterSkuTier: 'Standard',
        windowsAdminUsername: 'azureuser',
        externalWorkspaceResourceId: '/subscriptions/xxx/resourceGroups/yyy',
        nodePools: [{name: 'default', vmSize: 'Standard_D2s_v3'}],
        azureActiveDirectoryProfile: {managed: true},
        outboundIps: [{resourceId: '/subscriptions/xxx'}],
        workloadIdentityEnabled: true,
        privateClusterDisabled: false,
        networkPolicyProvider: 'azure',
        masterIpv4CidrBlock: '172.16.0.0/28',
        priorityClasses: [{name: 'high', value: 1000}],
        roles: [{name: 'admin'}],
      });
      expect(c.parameters.getOptionalFieldByName('kubernetesVersion')).toBe(
        '1.28',
      );
      expect(
        c.parameters.getOptionalFieldByName('vnetSubnetAddressIpRange'),
      ).toBe('10.0.0.0/16');
      expect(
        c.parameters.getOptionalFieldByName('managedClusterSkuTier'),
      ).toBe('Standard');
      expect(
        c.parameters.getOptionalFieldByName('windowsAdminUsername'),
      ).toBe('azureuser');
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

      const c = AzureAksCluster.satisfy(platform.platform).build();
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
      const c = AzureAksCluster.satisfy(platform.platform).build();
      expect(c.type.toString()).toBe('NetworkAndCompute.PaaS.Kubernetes');
    });

    it('should allow setting vendor-specific params via sealed builder', () => {
      const platform = ContainerPlatform.create({
        id: 'test-cluster',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Test Cluster',
      });

      const c = AzureAksCluster.satisfy(platform.platform)
        .withKubernetesVersion('1.28')
        .withVnetSubnetAddressIpRange('10.0.0.0/16')
        .withManagedClusterSkuTier('Standard')
        .withWindowsAdminUsername('azureuser')
        .withExternalWorkspaceResourceId('/subscriptions/xxx')
        .withNodePools([{name: 'default'}])
        .withAzureActiveDirectoryProfile({managed: true})
        .withOutboundIps([{resourceId: '/subscriptions/xxx'}])
        .withWorkloadIdentityEnabled(true)
        .withPrivateClusterDisabled(false)
        .withNetworkPolicyProvider('azure')
        .withMasterIpv4CidrBlock('172.16.0.0/28')
        .withPriorityClasses([{name: 'high'}])
        .withRoles([{name: 'admin'}])
        .build();

      expect(c.parameters.getOptionalFieldByName('kubernetesVersion')).toBe(
        '1.28',
      );
      expect(
        c.parameters.getOptionalFieldByName('vnetSubnetAddressIpRange'),
      ).toBe('10.0.0.0/16');
      expect(
        c.parameters.getOptionalFieldByName('workloadIdentityEnabled'),
      ).toBe(true);
    });
  });

  describe('getBuilder()', () => {
    it('should build a cluster via fluent builder', () => {
      const c = AzureAksCluster.getBuilder()
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
