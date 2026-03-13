import {describe, expect, it} from 'vitest';
import {GcpVpc} from './gcp_vpc';
import {
  VirtualNetwork,
  CIDR_BLOCK_PARAM,
} from '../../../../fractal/component/network_and_compute/iaas/virtual_network';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-gcp-vpc',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My GCP VPC',
  cidrBlock: '10.0.0.0/16',
};

describe('GcpVpc', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpVpc.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.GcpVpc');
    });

    it('should set provider to GCP', () => {
      const c = GcpVpc.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should set cidrBlock parameter', () => {
      const c = GcpVpc.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.0.0/16'
      );
    });

    it('should set optional autoCreateSubnetworks and routingMode parameters', () => {
      const c = GcpVpc.create({
        ...BASE_CONFIG,
        autoCreateSubnetworks: false,
        routingMode: 'GLOBAL',
      });
      expect(
        c.parameters.getOptionalFieldByName('autoCreateSubnetworks')
      ).toBe(false);
      expect(c.parameters.getOptionalFieldByName('routingMode')).toBe(
        'GLOBAL'
      );
    });

    it('should not set optional params when omitted', () => {
      const c = GcpVpc.create(BASE_CONFIG);
      expect(
        c.parameters.getOptionalFieldByName('autoCreateSubnetworks')
      ).toBeNull();
      expect(c.parameters.getOptionalFieldByName('routingMode')).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-gcp-vpc',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint GCP VPC',
        cidrBlock: '172.16.0.0/12',
      });

      const c = GcpVpc.satisfy(vpc).build();

      expect(c.id.toString()).toBe('bp-gcp-vpc');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint GCP VPC');
    });

    it('should carry cidrBlock from blueprint parameters', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-gcp-vpc',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint GCP VPC',
        cidrBlock: '10.1.0.0/16',
      });

      const c = GcpVpc.satisfy(vpc).build();
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.1.0.0/16'
      );
    });

    it('should allow setting vendor-specific params after satisfy', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-gcp-vpc-b',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint GCP VPC B',
        cidrBlock: '10.0.0.0/16',
      });

      const c = GcpVpc.satisfy(vpc)
        .withAutoCreateSubnetworks(false)
        .withRoutingMode('REGIONAL')
        .build();

      expect(
        c.parameters.getOptionalFieldByName('autoCreateSubnetworks')
      ).toBe(false);
      expect(c.parameters.getOptionalFieldByName('routingMode')).toBe(
        'REGIONAL'
      );
    });

    it('should carry dependencies from blueprint', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-gcp-vpc',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint GCP VPC',
      });

      const c = GcpVpc.satisfy(vpc).build();
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

      const c = GcpVpc.satisfy(sourceVm.component).build();
      expect(c.links).toHaveLength(1);
      expect(c.links[0].id.toString()).toBe('target-vm');
      expect(c.links[0].parameters.getOptionalFieldByName('fromPort')).toBe(
        8080
      );
    });
  });
});
