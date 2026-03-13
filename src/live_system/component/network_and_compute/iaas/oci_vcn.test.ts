import {describe, expect, it} from 'vitest';
import {OciVcn} from './oci_vcn';
import {
  VirtualNetwork,
  CIDR_BLOCK_PARAM,
} from '../../../../fractal/component/network_and_compute/iaas/virtual_network';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-vcn',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My VCN',
  cidrBlock: '10.0.0.0/16',
  compartmentId: 'ocid1.compartment.oc1..aaaaaa',
};

describe('OciVcn', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = OciVcn.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.OciVcn');
    });

    it('should set provider to OCI', () => {
      const c = OciVcn.create(BASE_CONFIG);
      expect(c.provider).toBe('OCI');
    });

    it('should set cidrBlock parameter', () => {
      const c = OciVcn.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.0.0/16'
      );
    });

    it('should set compartmentId parameter', () => {
      const c = OciVcn.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('compartmentId')).toBe(
        'ocid1.compartment.oc1..aaaaaa'
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-vcn',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint VCN',
        cidrBlock: '172.16.0.0/12',
      });

      const c = OciVcn.satisfy(vpc)
        .withCompartmentId('ocid1.compartment.oc1..bbbbbb')
        .build();

      expect(c.id.toString()).toBe('bp-vcn');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint VCN');
    });

    it('should carry cidrBlock from blueprint parameters', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-vcn',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VCN',
        cidrBlock: '10.1.0.0/16',
      });

      const c = OciVcn.satisfy(vpc)
        .withCompartmentId('ocid1.compartment.oc1..cccccc')
        .build();
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.1.0.0/16'
      );
    });

    it('should allow setting compartmentId after satisfy', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-vcn',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VCN',
        cidrBlock: '10.0.0.0/16',
      });

      const c = OciVcn.satisfy(vpc)
        .withCompartmentId('ocid1.compartment.oc1..dddddd')
        .build();
      expect(c.parameters.getOptionalFieldByName('compartmentId')).toBe(
        'ocid1.compartment.oc1..dddddd'
      );
    });

    it('should carry dependencies from blueprint', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-vcn',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VCN',
      });

      const c = OciVcn.satisfy(vpc).build();
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

      const c = OciVcn.satisfy(sourceVm.component).build();
      expect(c.links).toHaveLength(1);
      expect(c.links[0].id.toString()).toBe('target-vm');
      expect(c.links[0].parameters.getOptionalFieldByName('fromPort')).toBe(
        8080
      );
    });
  });
});
