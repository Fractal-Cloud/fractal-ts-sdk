import {describe, expect, it} from 'vitest';
import {ArubaContainerRegistry} from './aruba_container_registry';

const BASE_CONFIG = {
  id: 'my-registry',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Registry',
};

describe('ArubaContainerRegistry', () => {
  describe('create()', () => {
    it('should build with the correct type string', () => {
      const c = ArubaContainerRegistry.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.PaaS.ArubaContainerRegistry',
      );
    });

    it('should set provider to Aruba', () => {
      const c = ArubaContainerRegistry.create(BASE_CONFIG);
      expect(c.provider).toBe('Aruba');
    });

    it('should set size when provided', () => {
      const c = ArubaContainerRegistry.create({...BASE_CONFIG, size: 'Medium'});
      expect(c.parameters.getOptionalFieldByName('size')).toBe('Medium');
    });
  });
});
