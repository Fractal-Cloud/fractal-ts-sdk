import {describe, expect, it} from 'vitest';
import {ArubaVpc} from './aruba_vpc';
import {VirtualNetwork} from '../../../../fractal/component/network_and_compute/iaas/virtual_network';

const BASE_CONFIG = {
  id: 'my-vpc',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Aruba VPC',
};

describe('ArubaVpc', () => {
  describe('create()', () => {
    it('should build with the correct type string', () => {
      const c = ArubaVpc.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.ArubaVpc');
    });

    it('should set provider to Aruba', () => {
      const c = ArubaVpc.create(BASE_CONFIG);
      expect(c.provider).toBe('Aruba');
    });

    it('should set name and location parameters when provided', () => {
      const c = ArubaVpc.create({
        ...BASE_CONFIG,
        name: 'prod-vpc',
        location: 'ITBG-Bergamo',
      });
      expect(c.parameters.getOptionalFieldByName('name')).toBe('prod-vpc');
      expect(c.parameters.getOptionalFieldByName('location')).toBe(
        'ITBG-Bergamo',
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-vpc',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint VPC',
        cidrBlock: '10.0.0.0/16',
      });

      const c = ArubaVpc.satisfy(vpc).build();

      expect(c.id.toString()).toBe('bp-vpc');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint VPC');
    });

    it('should allow setting vendor params on the sealed builder', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-vpc',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VPC',
        cidrBlock: '10.0.0.0/16',
      });

      const c = ArubaVpc.satisfy(vpc)
        .withName('prod')
        .withLocation('ITBG-Bergamo')
        .build();

      expect(c.parameters.getOptionalFieldByName('name')).toBe('prod');
      expect(c.parameters.getOptionalFieldByName('location')).toBe(
        'ITBG-Bergamo',
      );
    });
  });
});
