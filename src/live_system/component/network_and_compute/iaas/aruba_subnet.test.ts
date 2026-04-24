import {describe, expect, it} from 'vitest';
import {ArubaSubnet} from './aruba_subnet';
import {
  Subnet,
  CIDR_BLOCK_PARAM,
} from '../../../../fractal/component/network_and_compute/iaas/subnet';

const BASE_CONFIG = {
  id: 'my-subnet',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Aruba Subnet',
  cidrBlock: '10.0.1.0/24',
};

describe('ArubaSubnet', () => {
  describe('create()', () => {
    it('should build with the correct type string', () => {
      const c = ArubaSubnet.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.ArubaSubnet');
    });

    it('should set provider to Aruba', () => {
      const c = ArubaSubnet.create(BASE_CONFIG);
      expect(c.provider).toBe('Aruba');
    });

    it('should set cidrBlock parameter', () => {
      const c = ArubaSubnet.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.1.0/24',
      );
    });
  });

  describe('satisfy()', () => {
    it('should carry cidrBlock from blueprint parameters', () => {
      const {subnet} = Subnet.create({
        id: 'bp-subnet',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Subnet',
        cidrBlock: '172.16.1.0/24',
      });

      const c = ArubaSubnet.satisfy(subnet).build();
      expect(c.id.toString()).toBe('bp-subnet');
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '172.16.1.0/24',
      );
    });
  });
});
