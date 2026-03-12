import {describe, expect, it} from 'vitest';
import {SaaSUnmanaged} from './unmanaged';
import {Unmanaged as UnmanagedBlueprint} from '../../../../fractal/component/storage/saas/unmanaged';

const BASE_CONFIG = {
  id: 'my-unmanaged',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Unmanaged',
};

describe('SaaSUnmanaged', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = SaaSUnmanaged.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.SaaS.Unmanaged');
    });

    it('should set provider to SaaS', () => {
      const c = SaaSUnmanaged.create(BASE_CONFIG);
      expect(c.provider).toBe('SaaS');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = UnmanagedBlueprint.create({
        id: 'bp-unmanaged',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Unmanaged',
      });

      const c = SaaSUnmanaged.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-unmanaged');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Unmanaged');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = UnmanagedBlueprint.create({
        id: 'bp-unmanaged',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Unmanaged',
      });

      const c = SaaSUnmanaged.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
