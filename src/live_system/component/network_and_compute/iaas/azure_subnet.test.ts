import {describe, expect, it} from 'vitest';
import {AzureSubnet} from './azure_subnet';
import {
  Subnet,
  CIDR_BLOCK_PARAM,
} from '../../../../fractal/component/network_and_compute/iaas/subnet';

const BASE_CONFIG = {
  id: 'my-subnet',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Subnet',
  cidrBlock: '10.0.1.0/24',
  resourceGroup: 'my-rg',
};

describe('AzureSubnet', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureSubnet.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.AzureSubnet');
    });

    it('should set provider to Azure', () => {
      const c = AzureSubnet.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set cidrBlock and resourceGroup parameters', () => {
      const c = AzureSubnet.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.1.0/24'
      );
      expect(c.parameters.getOptionalFieldByName('resourceGroup')).toBe(
        'my-rg'
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {subnet} = Subnet.create({
        id: 'bp-subnet',
        version: {major: 3, minor: 2, patch: 1},
        displayName: 'Blueprint Subnet',
        cidrBlock: '10.0.2.0/24',
      });

      const c = AzureSubnet.satisfy(subnet)
        .withResourceGroup('bp-rg')
        .build();

      expect(c.id.toString()).toBe('bp-subnet');
      expect(c.version.major).toBe(3);
      expect(c.version.minor).toBe(2);
      expect(c.version.patch).toBe(1);
      expect(c.displayName).toBe('Blueprint Subnet');
    });

    it('should carry cidrBlock from blueprint parameters', () => {
      const {subnet} = Subnet.create({
        id: 'bp-subnet',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Subnet',
        cidrBlock: '10.0.3.0/24',
      });

      const c = AzureSubnet.satisfy(subnet)
        .withResourceGroup('rg')
        .build();

      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.3.0/24'
      );
    });

    it('should allow setting vendor-specific params after satisfy', () => {
      const {subnet} = Subnet.create({
        id: 'bp-subnet-b',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Subnet B',
        cidrBlock: '10.0.4.0/24',
      });

      const c = AzureSubnet.satisfy(subnet)
        .withResourceGroup('prod-rg')
        .build();

      expect(c.parameters.getOptionalFieldByName('resourceGroup')).toBe(
        'prod-rg'
      );
    });
  });
});
