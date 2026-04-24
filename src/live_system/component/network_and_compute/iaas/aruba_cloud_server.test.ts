import {describe, expect, it} from 'vitest';
import {ArubaCloudServer} from './aruba_cloud_server';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-server',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Aruba Server',
};

describe('ArubaCloudServer', () => {
  describe('create()', () => {
    it('should build with the correct type string', () => {
      const c = ArubaCloudServer.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.IaaS.ArubaCloudServer',
      );
    });

    it('should set provider to Aruba', () => {
      const c = ArubaCloudServer.create(BASE_CONFIG);
      expect(c.provider).toBe('Aruba');
    });

    it('should set vendor parameters when provided', () => {
      const c = ArubaCloudServer.create({
        ...BASE_CONFIG,
        flavorName: 'VMC1A2',
        bootVolume: 'ubuntu-22.04',
        userData: '#!/bin/bash\necho hi',
      });
      expect(c.parameters.getOptionalFieldByName('flavorName')).toBe('VMC1A2');
      expect(c.parameters.getOptionalFieldByName('bootVolume')).toBe(
        'ubuntu-22.04',
      );
      expect(c.parameters.getOptionalFieldByName('userData')).toBe(
        '#!/bin/bash\necho hi',
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from VirtualMachine blueprint', () => {
      const bp = VirtualMachine.create({
        id: 'bp-vm',
        version: {major: 2, minor: 0, patch: 0},
        displayName: 'Blueprint VM',
      });

      const c = ArubaCloudServer.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-vm');
      expect(c.version.major).toBe(2);
      expect(c.displayName).toBe('Blueprint VM');
    });

    it('should allow vendor params on the sealed builder', () => {
      const bp = VirtualMachine.create({
        id: 'bp-vm',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VM',
      });

      const c = ArubaCloudServer.satisfy(bp.component)
        .withFlavorName('VMC1A2')
        .withBootVolume('ubuntu-22.04')
        .withUserData('#!/bin/bash')
        .build();

      expect(c.parameters.getOptionalFieldByName('flavorName')).toBe('VMC1A2');
      expect(c.parameters.getOptionalFieldByName('bootVolume')).toBe(
        'ubuntu-22.04',
      );
      expect(c.parameters.getOptionalFieldByName('userData')).toBe(
        '#!/bin/bash',
      );
    });
  });
});
