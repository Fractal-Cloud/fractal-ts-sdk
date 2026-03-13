import {describe, expect, it} from 'vitest';
import {HetznerServer} from './hetzner_server';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-server',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Server',
  serverType: 'cx21',
  location: 'fsn1',
  image: 'ubuntu-22.04',
};

describe('HetznerServer', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = HetznerServer.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.HetznerServer');
    });

    it('should set provider to Hetzner', () => {
      const c = HetznerServer.create(BASE_CONFIG);
      expect(c.provider).toBe('Hetzner');
    });

    it('should set required serverType, location, and image parameters', () => {
      const c = HetznerServer.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('serverType')).toBe('cx21');
      expect(c.parameters.getOptionalFieldByName('location')).toBe('fsn1');
      expect(c.parameters.getOptionalFieldByName('image')).toBe(
        'ubuntu-22.04'
      );
    });

    it('should set optional parameters when provided', () => {
      const c = HetznerServer.create({
        ...BASE_CONFIG,
        sshKeys: ['my-key-a', 'my-key-b'],
        userData: '#!/bin/bash\necho hello',
      });
      expect(c.parameters.getOptionalFieldByName('sshKeys')).toEqual([
        'my-key-a',
        'my-key-b',
      ]);
      expect(c.parameters.getOptionalFieldByName('userData')).toBe(
        '#!/bin/bash\necho hello'
      );
    });

    it('should not set optional params when omitted', () => {
      const c = HetznerServer.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('sshKeys')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('userData')).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName, and description from blueprint', () => {
      const blueprint = VirtualMachine.getBuilder()
        .withId('bp-vm')
        .withVersion(2, 0, 0)
        .withDisplayName('Blueprint VM')
        .withDescription('A VM')
        .build();

      const c = HetznerServer.satisfy(blueprint)
        .withServerType('cx21')
        .withLocation('fsn1')
        .withImage('ubuntu-22.04')
        .build();

      expect(c.id.toString()).toBe('bp-vm');
      expect(c.version.major).toBe(2);
      expect(c.displayName).toBe('Blueprint VM');
      expect(c.description).toBe('A VM');
    });

    it('should allow setting all Hetzner-specific params after satisfy', () => {
      const {component: blueprint} = VirtualMachine.create({
        id: 'bp-vm-b',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VM B',
      });

      const c = HetznerServer.satisfy(blueprint)
        .withServerType('cpx31')
        .withLocation('nbg1')
        .withImage('debian-12')
        .withSshKeys(['key-a'])
        .withUserData('#!/bin/bash')
        .build();

      expect(c.parameters.getOptionalFieldByName('serverType')).toBe('cpx31');
      expect(c.parameters.getOptionalFieldByName('location')).toBe('nbg1');
      expect(c.parameters.getOptionalFieldByName('image')).toBe('debian-12');
      expect(c.parameters.getOptionalFieldByName('sshKeys')).toEqual([
        'key-a',
      ]);
      expect(c.parameters.getOptionalFieldByName('userData')).toBe(
        '#!/bin/bash'
      );
    });

    it('should carry links from the blueprint unchanged', () => {
      const apiServer = VirtualMachine.create({
        id: 'api-server',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'API Server',
      });
      const webServer = VirtualMachine.create({
        id: 'web-server',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Web Server',
      }).linkToVirtualMachine([
        {target: apiServer, fromPort: 8080, protocol: 'tcp'},
      ]);

      const c = HetznerServer.satisfy(webServer.component)
        .withServerType('cx21')
        .withLocation('fsn1')
        .withImage('ubuntu-22.04')
        .build();

      expect(c.links).toHaveLength(1);
      expect(c.links[0].id.toString()).toBe('api-server');
      expect(c.links[0].parameters.getOptionalFieldByName('fromPort')).toBe(
        8080
      );
      expect(c.links[0].parameters.getOptionalFieldByName('protocol')).toBe(
        'tcp'
      );
    });

    it('should carry dependencies from the blueprint unchanged', () => {
      const rawVm = VirtualMachine.getBuilder()
        .withId('dep-vm')
        .withVersion(1, 0, 0)
        .withDisplayName('Dep VM')
        .build();
      const vmWithDep = {
        ...rawVm,
        dependencies: [{id: rawVm.id}],
      };

      const c = HetznerServer.satisfy(vmWithDep)
        .withServerType('cx21')
        .withLocation('fsn1')
        .withImage('ubuntu-22.04')
        .build();
      expect(c.dependencies).toHaveLength(1);
    });
  });
});
