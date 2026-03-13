import {describe, expect, it} from 'vitest';
import {HetznerSubnet} from './hetzner_subnet';
import {
  Subnet,
  CIDR_BLOCK_PARAM,
} from '../../../../fractal/component/network_and_compute/iaas/subnet';

const BASE_CONFIG = {
  id: 'my-subnet',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Hetzner Subnet',
  cidrBlock: '10.0.1.0/24',
  networkZone: 'eu-central',
};

describe('HetznerSubnet', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = HetznerSubnet.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.HetznerSubnet');
    });

    it('should set provider to Hetzner', () => {
      const c = HetznerSubnet.create(BASE_CONFIG);
      expect(c.provider).toBe('Hetzner');
    });

    it('should set cidrBlock and networkZone parameters', () => {
      const c = HetznerSubnet.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.1.0/24'
      );
      expect(c.parameters.getOptionalFieldByName('networkZone')).toBe(
        'eu-central'
      );
    });

    it('should set optional type parameter when provided', () => {
      const c = HetznerSubnet.create({...BASE_CONFIG, type: 'cloud'});
      expect(c.parameters.getOptionalFieldByName('type')).toBe('cloud');
    });

    it('should not set optional type param when omitted', () => {
      const c = HetznerSubnet.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('type')).toBeNull();
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

      const c = HetznerSubnet.satisfy(subnet)
        .withNetworkZone('eu-central')
        .build();

      expect(c.id.toString()).toBe('bp-subnet');
      expect(c.version.major).toBe(3);
      expect(c.displayName).toBe('Blueprint Subnet');
    });

    it('should carry cidrBlock from blueprint parameters', () => {
      const {subnet} = Subnet.create({
        id: 'bp-subnet',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Subnet',
        cidrBlock: '10.0.3.0/24',
      });

      const c = HetznerSubnet.satisfy(subnet)
        .withNetworkZone('eu-central')
        .build();

      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.3.0/24'
      );
    });

    it('should allow setting vendor-specific params after satisfy', () => {
      const {subnet} = Subnet.create({
        id: 'bp-subnet',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Subnet',
        cidrBlock: '10.0.4.0/24',
      });

      const c = HetznerSubnet.satisfy(subnet)
        .withNetworkZone('us-east')
        .withType('cloud')
        .build();

      expect(c.parameters.getOptionalFieldByName('networkZone')).toBe(
        'us-east'
      );
      expect(c.parameters.getOptionalFieldByName('type')).toBe('cloud');
    });
  });
});
