import {describe, expect, it} from 'vitest';
import {AwsSubnet} from './subnet';
import {Subnet} from '../../../../fractal/component/network_and_compute/iaas/subnet';
import {CIDR_BLOCK_PARAM} from '../../../../fractal/component/network_and_compute/iaas/subnet';

const BASE_CONFIG = {
  id: 'my-subnet',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Subnet',
  cidrBlock: '10.0.1.0/24',
  availabilityZone: 'eu-central-1a',
};

describe('AwsSubnet', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AwsSubnet.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.AwsSubnet');
    });

    it('should set provider to AWS', () => {
      const c = AwsSubnet.create(BASE_CONFIG);
      expect(c.provider).toBe('AWS');
    });

    it('should set cidrBlock and availabilityZone parameters', () => {
      const c = AwsSubnet.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.1.0/24'
      );
      expect(
        c.parameters.getOptionalFieldByName('availabilityZone')
      ).toBe('eu-central-1a');
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

      const c = AwsSubnet.satisfy(subnet)
        .withAvailabilityZone('eu-central-1b')
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

      const c = AwsSubnet.satisfy(subnet)
        .withAvailabilityZone('eu-central-1a')
        .build();

      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.3.0/24'
      );
    });
  });
});
