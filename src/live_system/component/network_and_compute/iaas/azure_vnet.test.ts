import {describe, expect, it} from 'vitest';
import {AzureVnet} from './azure_vnet';
import {
  VirtualNetwork,
  CIDR_BLOCK_PARAM,
} from '../../../../fractal/component/network_and_compute/iaas/virtual_network';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-vnet',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My VNet',
  cidrBlock: '10.0.0.0/16',
  location: 'eastus',
  resourceGroup: 'my-rg',
};

describe('AzureVnet', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureVnet.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.AzureVnet');
    });

    it('should set provider to Azure', () => {
      const c = AzureVnet.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set cidrBlock parameter', () => {
      const c = AzureVnet.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.0.0/16'
      );
    });

    it('should set location and resourceGroup parameters', () => {
      const c = AzureVnet.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('location')).toBe('eastus');
      expect(c.parameters.getOptionalFieldByName('resourceGroup')).toBe(
        'my-rg'
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-vnet',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint VNet',
        cidrBlock: '172.16.0.0/12',
      });

      const c = AzureVnet.satisfy(vpc)
        .withLocation('westeurope')
        .withResourceGroup('bp-rg')
        .build();

      expect(c.id.toString()).toBe('bp-vnet');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint VNet');
    });

    it('should carry cidrBlock from blueprint parameters', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-vnet',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VNet',
        cidrBlock: '10.1.0.0/16',
      });

      const c = AzureVnet.satisfy(vpc)
        .withLocation('eastus')
        .withResourceGroup('rg')
        .build();
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.1.0.0/16'
      );
    });

    it('should allow setting vendor-specific params after satisfy', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-vnet-b',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VNet B',
        cidrBlock: '10.0.0.0/16',
      });

      const c = AzureVnet.satisfy(vpc)
        .withLocation('northeurope')
        .withResourceGroup('prod-rg')
        .build();

      expect(c.parameters.getOptionalFieldByName('location')).toBe(
        'northeurope'
      );
      expect(c.parameters.getOptionalFieldByName('resourceGroup')).toBe(
        'prod-rg'
      );
    });

    it('should carry dependencies from blueprint', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-vnet',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VNet',
      });

      const c = AzureVnet.satisfy(vpc).build();
      expect(c.dependencies).toHaveLength(0);
    });

    it('should carry links from blueprint', () => {
      const targetVm = VirtualMachine.create({
        id: 'target-vm',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Target VM',
      });
      const sourceVm = VirtualMachine.create({
        id: 'source-vm',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Source VM',
      }).linkToVirtualMachine([{target: targetVm, fromPort: 8080}]);

      const c = AzureVnet.satisfy(sourceVm.component).build();
      expect(c.links).toHaveLength(1);
      expect(c.links[0].id.toString()).toBe('target-vm');
      expect(c.links[0].parameters.getOptionalFieldByName('fromPort')).toBe(
        8080
      );
    });
  });
});
