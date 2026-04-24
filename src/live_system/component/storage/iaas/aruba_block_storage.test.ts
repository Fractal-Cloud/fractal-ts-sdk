import {describe, expect, it} from 'vitest';
import {ArubaBlockStorage} from './aruba_block_storage';

const BASE_CONFIG = {
  id: 'my-volume',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Volume',
  sizeGb: 100,
};

describe('ArubaBlockStorage', () => {
  describe('create()', () => {
    it('should build with the correct type string', () => {
      const c = ArubaBlockStorage.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.IaaS.ArubaBlockStorage');
    });

    it('should set provider to Aruba', () => {
      const c = ArubaBlockStorage.create(BASE_CONFIG);
      expect(c.provider).toBe('Aruba');
    });

    it('should set sizeGb parameter', () => {
      const c = ArubaBlockStorage.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('sizeGb')).toBe(100);
    });

    it('should set storageType as `type` parameter when provided', () => {
      const c = ArubaBlockStorage.create({
        ...BASE_CONFIG,
        storageType: 'Performance',
      });
      expect(c.parameters.getOptionalFieldByName('type')).toBe('Performance');
    });
  });
});
