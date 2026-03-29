import {describe, expect, it} from 'vitest';
import {VspherePortGroup} from './vsphere_port_group';
import {VirtualNetwork} from '../../../../fractal/component/network_and_compute/iaas/virtual_network';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-port-group',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Port Group',
  dvSwitchName: 'dvs-prod',
  datacenter: 'dc-west',
  vlanId: 100,
};

describe('VspherePortGroup', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = VspherePortGroup.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.IaaS.VspherePortGroup'
      );
    });

    it('should set provider to VMware', () => {
      const c = VspherePortGroup.create(BASE_CONFIG);
      expect(c.provider).toBe('VMware');
    });

    it('should set required dvSwitchName, datacenter, and vlanId parameters', () => {
      const c = VspherePortGroup.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('dvSwitchName')).toBe(
        'dvs-prod'
      );
      expect(c.parameters.getOptionalFieldByName('datacenter')).toBe(
        'dc-west'
      );
      expect(c.parameters.getOptionalFieldByName('vlanId')).toBe(100);
    });

    it('should set optional parameters when provided', () => {
      const c = VspherePortGroup.create({
        ...BASE_CONFIG,
        numPorts: 128,
        portBinding: 'static',
      });
      expect(c.parameters.getOptionalFieldByName('numPorts')).toBe(128);
      expect(c.parameters.getOptionalFieldByName('portBinding')).toBe(
        'static'
      );
    });

    it('should not set optional params when omitted', () => {
      const c = VspherePortGroup.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('numPorts')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('portBinding')).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName, and description from blueprint', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-net',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Network',
        description: 'A network',
        cidrBlock: '10.0.0.0/16',
      });

      const c = VspherePortGroup.satisfy(vpc)
        .withDvSwitchName('dvs-prod')
        .withDatacenter('dc-west')
        .withVlanId(200)
        .build();

      expect(c.id.toString()).toBe('bp-net');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Network');
      expect(c.description).toBe('A network');
    });

    it('should allow setting all VMware-specific params after satisfy', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-net-b',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Network B',
      });

      const c = VspherePortGroup.satisfy(vpc)
        .withDvSwitchName('dvs-staging')
        .withDatacenter('dc-east')
        .withVlanId(300)
        .withNumPorts(256)
        .withPortBinding('ephemeral')
        .build();

      expect(c.parameters.getOptionalFieldByName('dvSwitchName')).toBe(
        'dvs-staging'
      );
      expect(c.parameters.getOptionalFieldByName('datacenter')).toBe(
        'dc-east'
      );
      expect(c.parameters.getOptionalFieldByName('vlanId')).toBe(300);
      expect(c.parameters.getOptionalFieldByName('numPorts')).toBe(256);
      expect(c.parameters.getOptionalFieldByName('portBinding')).toBe(
        'ephemeral'
      );
    });

    it('should carry links from the blueprint unchanged', () => {
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

      const c = VspherePortGroup.satisfy(sourceVm.component)
        .withDvSwitchName('dvs-prod')
        .withDatacenter('dc-west')
        .withVlanId(100)
        .build();

      expect(c.links).toHaveLength(1);
      expect(c.links[0].id.toString()).toBe('target-vm');
      expect(c.links[0].parameters.getOptionalFieldByName('fromPort')).toBe(
        8080
      );
    });

    it('should carry dependencies from the blueprint unchanged', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-net',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Network',
      });

      const c = VspherePortGroup.satisfy(vpc)
        .withDvSwitchName('dvs-prod')
        .withDatacenter('dc-west')
        .withVlanId(100)
        .build();

      expect(c.dependencies).toHaveLength(0);
    });
  });
});
