import {describe, expect, it} from 'vitest';
import {VsphereVlan} from './vsphere_vlan';
import {
  Subnet,
  CIDR_BLOCK_PARAM,
} from '../../../../fractal/component/network_and_compute/iaas/subnet';

const BASE_CONFIG = {
  id: 'my-vlan',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My VLAN',
  cidrBlock: '10.0.1.0/24',
  vlanId: 100,
  gateway: '10.0.1.1',
  dvSwitchName: 'dvs-prod',
  datacenter: 'dc-west',
};

describe('VsphereVlan', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = VsphereVlan.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.VsphereVlan');
    });

    it('should set provider to VMware', () => {
      const c = VsphereVlan.create(BASE_CONFIG);
      expect(c.provider).toBe('VMware');
    });

    it('should set cidrBlock and vendor-specific parameters', () => {
      const c = VsphereVlan.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.1.0/24'
      );
      expect(c.parameters.getOptionalFieldByName('vlanId')).toBe(100);
      expect(c.parameters.getOptionalFieldByName('gateway')).toBe('10.0.1.1');
      expect(c.parameters.getOptionalFieldByName('dvSwitchName')).toBe(
        'dvs-prod'
      );
      expect(c.parameters.getOptionalFieldByName('datacenter')).toBe(
        'dc-west'
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

      const c = VsphereVlan.satisfy(subnet)
        .withVlanId(200)
        .withGateway('10.0.2.1')
        .withDvSwitchName('dvs-prod')
        .withDatacenter('dc-west')
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

      const c = VsphereVlan.satisfy(subnet)
        .withVlanId(300)
        .withGateway('10.0.3.1')
        .withDvSwitchName('dvs-prod')
        .withDatacenter('dc-west')
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

      const c = VsphereVlan.satisfy(subnet)
        .withVlanId(400)
        .withGateway('10.0.4.1')
        .withDvSwitchName('dvs-staging')
        .withDatacenter('dc-east')
        .build();

      expect(c.parameters.getOptionalFieldByName('vlanId')).toBe(400);
      expect(c.parameters.getOptionalFieldByName('gateway')).toBe('10.0.4.1');
      expect(c.parameters.getOptionalFieldByName('dvSwitchName')).toBe(
        'dvs-staging'
      );
      expect(c.parameters.getOptionalFieldByName('datacenter')).toBe(
        'dc-east'
      );
    });
  });
});
