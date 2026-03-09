import {describe, expect, it} from 'vitest';
import {VirtualNetwork, CIDR_BLOCK_PARAM} from './virtual_network';
import {Subnet} from './subnet';
import {SecurityGroup} from './security_group';
import {VirtualMachine} from './vm';

const BASE_CONFIG = {
  id: 'my-vpc',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My VPC',
};

describe('VirtualNetwork', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {vpc} = VirtualNetwork.create(BASE_CONFIG);
      expect(vpc.type.toString()).toBe('NetworkAndCompute.IaaS.VirtualNetwork');
    });

    it('should set id, version, and displayName', () => {
      const {vpc} = VirtualNetwork.create(BASE_CONFIG);
      expect(vpc.id.toString()).toBe('my-vpc');
      expect(vpc.version.major).toBe(1);
      expect(vpc.version.minor).toBe(0);
      expect(vpc.version.patch).toBe(0);
      expect(vpc.displayName).toBe('My VPC');
    });

    it('should set cidrBlock parameter when provided', () => {
      const {vpc} = VirtualNetwork.create({...BASE_CONFIG, cidrBlock: '10.0.0.0/16'});
      expect(vpc.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.0.0/16'
      );
    });

    it('should not set cidrBlock parameter when omitted', () => {
      const {vpc} = VirtualNetwork.create(BASE_CONFIG);
      expect(vpc.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBeNull();
    });

    it('should set description when provided', () => {
      const {vpc} = VirtualNetwork.create({...BASE_CONFIG, description: 'A VPC'});
      expect(vpc.description).toBe('A VPC');
    });

    it('should start with no children', () => {
      const node = VirtualNetwork.create(BASE_CONFIG);
      expect(node.subnets).toHaveLength(0);
      expect(node.securityGroups).toHaveLength(0);
      expect(node.virtualMachines).toHaveLength(0);
      expect(node.components).toHaveLength(1);
    });

    it('withSubnets() should auto-wire VPC dependency on subnets and VMs', () => {
      const {vpc} = VirtualNetwork.create(BASE_CONFIG);
      const vm = VirtualMachine.create({
        id: 'my-vm',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'My VM',
      });
      const subnetNode = Subnet.create({
        id: 'my-subnet',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'My Subnet',
      }).withVirtualMachines([vm]);

      const node = VirtualNetwork.create(BASE_CONFIG).withSubnets([subnetNode]);
      expect(node.subnets).toHaveLength(1);
      expect(node.subnets[0].dependencies[0].id.toString()).toBe(
        vpc.id.toString()
      );
      expect(node.virtualMachines).toHaveLength(1);
      expect(node.components).toHaveLength(3); // vpc + subnet + vm
    });

    it('withSecurityGroups() should auto-wire VPC dependency on SGs', () => {
      const {vpc} = VirtualNetwork.create(BASE_CONFIG);
      const sg = SecurityGroup.create({
        id: 'my-sg',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'My SG',
        description: 'A security group',
      });

      const node = VirtualNetwork.create(BASE_CONFIG).withSecurityGroups([sg]);
      expect(node.securityGroups).toHaveLength(1);
      expect(node.securityGroups[0].dependencies[0].id.toString()).toBe(
        vpc.id.toString()
      );
      expect(node.components).toHaveLength(2); // vpc + sg
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component when all fields are set', () => {
      const {vpc} = VirtualNetwork.getBuilder()
        .withId('net-a')
        .withVersion(2, 3, 4)
        .withDisplayName('Network 1')
        .withDescription('desc')
        .withCidrBlock('192.168.0.0/16')
        .build();

      expect(vpc.type.toString()).toBe('NetworkAndCompute.IaaS.VirtualNetwork');
      expect(vpc.id.toString()).toBe('net-a');
      expect(vpc.version.major).toBe(2);
      expect(vpc.displayName).toBe('Network 1');
      expect(vpc.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '192.168.0.0/16'
      );
    });
  });
});
