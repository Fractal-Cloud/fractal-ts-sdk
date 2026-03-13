import {describe, expect, it} from 'vitest';
import {AzureLb} from './azure_lb';
import {VirtualNetwork} from '../../../../fractal/component/network_and_compute/iaas/virtual_network';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-lb',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Load Balancer',
};

describe('AzureLb', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureLb.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.LoadBalancer');
    });

    it('should set provider to Azure', () => {
      const c = AzureLb.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set optional vendor-specific parameters', () => {
      const c = AzureLb.create({
        ...BASE_CONFIG,
        azureRegion: 'westeurope',
        resourceGroupName: 'rg-network-prod',
        sku: 'Standard',
        frontendIpConfiguration: [
          {
            name: 'frontend-ip',
            subnetId: 'subnet-app-id',
            privateIpAddressAllocation: 'Dynamic',
          },
        ],
      });
      expect(
        c.parameters.getOptionalFieldByName('azureRegion')
      ).toBe('westeurope');
      expect(
        c.parameters.getOptionalFieldByName('resourceGroupName')
      ).toBe('rg-network-prod');
      expect(
        c.parameters.getOptionalFieldByName('sku')
      ).toBe('Standard');
      const frontendIp = c.parameters.getOptionalFieldByName(
        'frontendIpConfiguration'
      ) as Array<Record<string, string>>;
      expect(frontendIp).toHaveLength(1);
      expect(frontendIp[0].name).toBe('frontend-ip');
      expect(frontendIp[0].subnetId).toBe('subnet-app-id');
      expect(frontendIp[0].privateIpAddressAllocation).toBe('Dynamic');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-lb',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint LB',
        cidrBlock: '172.16.0.0/12',
      });

      const c = AzureLb.satisfy(vpc).build();

      expect(c.id.toString()).toBe('bp-lb');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint LB');
    });

    it('should carry dependencies from blueprint', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-lb',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint LB',
      });

      const c = AzureLb.satisfy(vpc).build();
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

      const c = AzureLb.satisfy(sourceVm.component).build();
      expect(c.links).toHaveLength(1);
      expect(c.links[0].id.toString()).toBe('target-vm');
      expect(c.links[0].parameters.getOptionalFieldByName('fromPort')).toBe(
        8080
      );
    });

    it('should allow setting vendor-specific params after satisfy', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-lb',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint LB',
      });

      const c = AzureLb.satisfy(vpc)
        .withAzureRegion('westeurope')
        .withResourceGroupName('rg-network-prod')
        .withSku('Standard')
        .withFrontendIpConfiguration([
          {
            name: 'frontend-ip',
            subnetId: 'subnet-app-id',
            privateIpAddressAllocation: 'Dynamic',
          },
        ])
        .build();

      expect(c.parameters.getOptionalFieldByName('azureRegion')).toBe(
        'westeurope'
      );
      expect(c.parameters.getOptionalFieldByName('resourceGroupName')).toBe(
        'rg-network-prod'
      );
      expect(c.parameters.getOptionalFieldByName('sku')).toBe('Standard');
      const frontendIp = c.parameters.getOptionalFieldByName(
        'frontendIpConfiguration'
      ) as Array<Record<string, string>>;
      expect(frontendIp).toHaveLength(1);
      expect(frontendIp[0].name).toBe('frontend-ip');
    });
  });
});
