import {describe, expect, it} from 'vitest';
import {GcpCloudStorage} from './gcp_cloud_storage';
import {FilesAndBlobs} from '../../../../fractal/component/storage/paas/files_and_blobs';

const BASE_CONFIG = {
  id: 'my-bucket',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Bucket',
  region: 'us-central1',
};

describe('GcpCloudStorage', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpCloudStorage.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.CloudStorage');
    });

    it('should set provider to GCP', () => {
      const c = GcpCloudStorage.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should set required region parameter', () => {
      const c = GcpCloudStorage.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('region')).toBe(
        'us-central1'
      );
    });

    it('should set optional parameters when provided', () => {
      const c = GcpCloudStorage.create({
        ...BASE_CONFIG,
        storageClass: 'NEARLINE',
        versioningEnabled: true,
        uniformBucketLevelAccess: true,
      });
      expect(c.parameters.getOptionalFieldByName('storageClass')).toBe(
        'NEARLINE'
      );
      expect(
        c.parameters.getOptionalFieldByName('versioningEnabled')
      ).toBe(true);
      expect(
        c.parameters.getOptionalFieldByName('uniformBucketLevelAccess')
      ).toBe(true);
    });

    it('should not set optional params when omitted', () => {
      const c = GcpCloudStorage.create(BASE_CONFIG);
      expect(
        c.parameters.getOptionalFieldByName('storageClass')
      ).toBeNull();
      expect(
        c.parameters.getOptionalFieldByName('versioningEnabled')
      ).toBeNull();
      expect(
        c.parameters.getOptionalFieldByName('uniformBucketLevelAccess')
      ).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {component: blueprint} = FilesAndBlobs.create({
        id: 'bp-storage',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Storage',
      });

      const c = GcpCloudStorage.satisfy(blueprint)
        .withRegion('europe-west1')
        .build();

      expect(c.id.toString()).toBe('bp-storage');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Storage');
    });

    it('should carry dependencies from blueprint', () => {
      const {component: blueprint} = FilesAndBlobs.create({
        id: 'bp-storage',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Storage',
      });

      const c = GcpCloudStorage.satisfy(blueprint).build();
      expect(c.dependencies).toHaveLength(0);
    });

    it('should carry links from blueprint', () => {
      const {component: blueprint} = FilesAndBlobs.create({
        id: 'bp-storage',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Storage',
      });

      const c = GcpCloudStorage.satisfy(blueprint).build();
      expect(c.links).toHaveLength(0);
    });
  });
});
