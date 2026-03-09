import {describe, expect, it} from 'vitest';
import {Subnet, CIDR_BLOCK_PARAM} from './subnet';
import {VirtualMachine} from './vm';

const BASE_CONFIG = {
  id: 'my-subnet',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Subnet',
};

describe('Subnet (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {subnet} = Subnet.create(BASE_CONFIG);
      expect(subnet.type.toString()).toBe('NetworkAndCompute.IaaS.Subnet');
    });

    it('should set id, version, and displayName', () => {
      const {subnet} = Subnet.create(BASE_CONFIG);
      expect(subnet.id.toString()).toBe('my-subnet');
      expect(subnet.version.major).toBe(1);
      expect(subnet.displayName).toBe('My Subnet');
    });

    it('should set cidrBlock parameter when provided', () => {
      const {subnet} = Subnet.create({...BASE_CONFIG, cidrBlock: '10.0.1.0/24'});
      expect(subnet.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.1.0/24'
      );
    });

    it('should not set cidrBlock parameter when omitted', () => {
      const {subnet} = Subnet.create(BASE_CONFIG);
      expect(subnet.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBeNull();
    });

    it('should set description when provided', () => {
      const {subnet} = Subnet.create({...BASE_CONFIG, description: 'Public subnet'});
      expect(subnet.description).toBe('Public subnet');
    });

    it('should start with no virtual machines', () => {
      const node = Subnet.create(BASE_CONFIG);
      expect(node.virtualMachines).toHaveLength(0);
      expect(node.components).toHaveLength(1);
    });

    it('withVirtualMachines() should auto-wire subnet dependency on VMs', () => {
      const {subnet} = Subnet.create(BASE_CONFIG);
      const vm = VirtualMachine.create({
        id: 'my-vm',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'My VM',
      });

      const node = Subnet.create(BASE_CONFIG).withVirtualMachines([vm]);
      expect(node.virtualMachines).toHaveLength(1);
      expect(node.virtualMachines[0].dependencies).toHaveLength(1);
      expect(node.virtualMachines[0].dependencies[0].id.toString()).toBe(
        subnet.id.toString()
      );
      expect(node.components).toHaveLength(2);
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component with cidrBlock', () => {
      const {subnet} = Subnet.getBuilder()
        .withId('subnet-a')
        .withVersion(1, 0, 0)
        .withDisplayName('Subnet A')
        .withCidrBlock('172.16.0.0/24')
        .build();

      expect(subnet.type.toString()).toBe('NetworkAndCompute.IaaS.Subnet');
      expect(subnet.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '172.16.0.0/24'
      );
    });
  });
});
