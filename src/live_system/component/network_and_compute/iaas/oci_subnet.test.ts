import {describe, expect, it} from 'vitest';
import {OciSubnet} from './oci_subnet';
import {
  Subnet,
  CIDR_BLOCK_PARAM,
} from '../../../../fractal/component/network_and_compute/iaas/subnet';

const BASE_CONFIG = {
  id: 'my-subnet',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My OCI Subnet',
  cidrBlock: '10.0.1.0/24',
  compartmentId: 'ocid1.compartment.oc1..aaaaaa',
};

describe('OciSubnet', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = OciSubnet.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.OciSubnet');
    });

    it('should set provider to OCI', () => {
      const c = OciSubnet.create(BASE_CONFIG);
      expect(c.provider).toBe('OCI');
    });

    it('should set cidrBlock and compartmentId parameters', () => {
      const c = OciSubnet.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.1.0/24'
      );
      expect(c.parameters.getOptionalFieldByName('compartmentId')).toBe(
        'ocid1.compartment.oc1..aaaaaa'
      );
    });

    it('should set optional parameters when provided', () => {
      const c = OciSubnet.create({
        ...BASE_CONFIG,
        availabilityDomain: 'AD-1',
        prohibitPublicIpOnVnic: true,
      });
      expect(c.parameters.getOptionalFieldByName('availabilityDomain')).toBe(
        'AD-1'
      );
      expect(
        c.parameters.getOptionalFieldByName('prohibitPublicIpOnVnic')
      ).toBe(true);
    });

    it('should not set optional params when omitted', () => {
      const c = OciSubnet.create(BASE_CONFIG);
      expect(
        c.parameters.getOptionalFieldByName('availabilityDomain')
      ).toBeNull();
      expect(
        c.parameters.getOptionalFieldByName('prohibitPublicIpOnVnic')
      ).toBeNull();
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

      const c = OciSubnet.satisfy(subnet)
        .withCompartmentId('ocid1.compartment.oc1..bbbbbb')
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

      const c = OciSubnet.satisfy(subnet)
        .withCompartmentId('ocid1.compartment.oc1..cccccc')
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

      const c = OciSubnet.satisfy(subnet)
        .withCompartmentId('ocid1.compartment.oc1..dddddd')
        .withAvailabilityDomain('AD-2')
        .withProhibitPublicIpOnVnic(false)
        .build();

      expect(c.parameters.getOptionalFieldByName('compartmentId')).toBe(
        'ocid1.compartment.oc1..dddddd'
      );
      expect(c.parameters.getOptionalFieldByName('availabilityDomain')).toBe(
        'AD-2'
      );
      expect(
        c.parameters.getOptionalFieldByName('prohibitPublicIpOnVnic')
      ).toBe(false);
    });
  });
});
