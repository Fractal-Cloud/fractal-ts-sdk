import {describe, expect, it} from 'vitest';
import {VirtualMachine} from './vm';
import {SecurityGroup} from './security_group';

const BASE_CONFIG = {
  id: 'my-vm',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My VM',
};

describe('VirtualMachine (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = VirtualMachine.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('NetworkAndCompute.IaaS.VirtualMachine');
    });

    it('should set id, version, and displayName', () => {
      const {component} = VirtualMachine.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-vm');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My VM');
    });

    it('should set description when provided', () => {
      const {component} = VirtualMachine.create({...BASE_CONFIG, description: 'App server'});
      expect(component.description).toBe('App server');
    });

    it('should not set description when omitted', () => {
      const {component} = VirtualMachine.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });

    it('linkToVirtualMachine() should add port links to the component', () => {
      const targetVm = VirtualMachine.create({
        id: 'target-vm',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Target VM',
      });
      const node = VirtualMachine.create(BASE_CONFIG).linkToVirtualMachine([
        {target: targetVm, fromPort: 8080, toPort: 8080, protocol: 'tcp'},
      ]);
      expect(node.component.links).toHaveLength(1);
      expect(node.component.links[0].id.toString()).toBe('target-vm');
      expect(node.component.links[0].parameters.getOptionalFieldByName('fromPort')).toBe(8080);
    });

    it('linkToSecurityGroup() should add a no-settings link to the SG', () => {
      const sg = SecurityGroup.create({
        id: 'web-sg',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Web SG',
        description: 'Web security group',
      });
      const node = VirtualMachine.create(BASE_CONFIG).linkToSecurityGroup([sg]);
      expect(node.component.links).toHaveLength(1);
      expect(node.component.links[0].id.toString()).toBe('web-sg');
      expect(node.component.links[0].parameters.toMap()).toEqual({});
    });

    it('linkToSecurityGroup() should not add a dependency', () => {
      const sg = SecurityGroup.create({
        id: 'web-sg',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Web SG',
        description: 'Web security group',
      });
      const node = VirtualMachine.create(BASE_CONFIG).linkToSecurityGroup([sg]);
      expect(node.component.dependencies).toHaveLength(0);
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = VirtualMachine.getBuilder()
        .withId('vm-a')
        .withVersion(2, 0, 0)
        .withDisplayName('VM A')
        .build();

      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.VirtualMachine');
      expect(c.id.toString()).toBe('vm-a');
      expect(c.dependencies).toHaveLength(0);
    });
  });
});
