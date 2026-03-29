import {describe, expect, it} from 'vitest';
import {OpenshiftPersistentVolume} from './openshift_persistent_volume';
import {Search} from '../../../../fractal/component/storage/caas/search';

const BASE_CONFIG = {
  id: 'my-pvc',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My PVC',
  name: 'data-volume',
  storageSize: '10Gi',
};

describe('OpenshiftPersistentVolume', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = OpenshiftPersistentVolume.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'Storage.CaaS.OpenshiftPersistentVolume'
      );
    });

    it('should set provider to RedHat', () => {
      const c = OpenshiftPersistentVolume.create(BASE_CONFIG);
      expect(c.provider).toBe('RedHat');
    });

    it('should set required name and storageSize parameters', () => {
      const c = OpenshiftPersistentVolume.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('name')).toBe('data-volume');
      expect(c.parameters.getOptionalFieldByName('storageSize')).toBe('10Gi');
    });

    it('should set optional parameters when provided', () => {
      const c = OpenshiftPersistentVolume.create({
        ...BASE_CONFIG,
        storageClassName: 'gp3',
        accessMode: 'ReadWriteOnce',
      });
      expect(c.parameters.getOptionalFieldByName('storageClassName')).toBe(
        'gp3'
      );
      expect(c.parameters.getOptionalFieldByName('accessMode')).toBe(
        'ReadWriteOnce'
      );
    });

    it('should not set optional params when omitted', () => {
      const c = OpenshiftPersistentVolume.create(BASE_CONFIG);
      expect(
        c.parameters.getOptionalFieldByName('storageClassName')
      ).toBeNull();
      expect(c.parameters.getOptionalFieldByName('accessMode')).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = Search.create({
        id: 'bp-search',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Search',
      });

      const c = OpenshiftPersistentVolume.satisfy(bp.search)
        .withName('vol')
        .withStorageSize('20Gi')
        .build();

      expect(c.id.toString()).toBe('bp-search');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Search');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = Search.create({
        id: 'bp-search',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Search',
      });

      const c = OpenshiftPersistentVolume.satisfy(bp.search)
        .withName('vol')
        .withStorageSize('10Gi')
        .build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should allow setting vendor-specific params via satisfied builder', () => {
      const bp = Search.create({
        id: 'bp-search',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Search',
      });

      const c = OpenshiftPersistentVolume.satisfy(bp.search)
        .withName('data')
        .withStorageSize('50Gi')
        .withStorageClassName('gp3-csi')
        .withAccessMode('ReadWriteMany')
        .build();

      expect(c.parameters.getOptionalFieldByName('name')).toBe('data');
      expect(c.parameters.getOptionalFieldByName('storageSize')).toBe('50Gi');
      expect(c.parameters.getOptionalFieldByName('storageClassName')).toBe(
        'gp3-csi'
      );
      expect(c.parameters.getOptionalFieldByName('accessMode')).toBe(
        'ReadWriteMany'
      );
    });
  });
});
