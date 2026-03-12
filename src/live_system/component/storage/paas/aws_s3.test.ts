import {describe, expect, it} from 'vitest';
import {AwsS3} from './aws_s3';
import {FilesAndBlobs} from '../../../../fractal/component/storage/paas/files_and_blobs';

const BASE_CONFIG = {
  id: 'my-bucket',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My S3 Bucket',
};

describe('AwsS3', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AwsS3.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.S3');
    });

    it('should set provider to AWS', () => {
      const c = AwsS3.create(BASE_CONFIG);
      expect(c.provider).toBe('AWS');
    });

    it('should set vendor-specific parameters', () => {
      const c = AwsS3.create({
        ...BASE_CONFIG,
        bucket: 'my-unique-bucket',
        acl: 'private',
        forceDestroy: true,
        versioningEnabled: true,
        objectLockEnabled: false,
      });
      expect(c.parameters.getOptionalFieldByName('bucket')).toBe(
        'my-unique-bucket'
      );
      expect(c.parameters.getOptionalFieldByName('acl')).toBe('private');
      expect(c.parameters.getOptionalFieldByName('forceDestroy')).toBe(true);
      expect(c.parameters.getOptionalFieldByName('versioningEnabled')).toBe(
        true
      );
      expect(c.parameters.getOptionalFieldByName('objectLockEnabled')).toBe(
        false
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = FilesAndBlobs.create({
        id: 'bp-bucket',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Bucket',
      });

      const c = AwsS3.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-bucket');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Bucket');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = FilesAndBlobs.create({
        id: 'bp-bucket',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Bucket',
      });

      const c = AwsS3.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should allow setting vendor-specific params via satisfied builder', () => {
      const bp = FilesAndBlobs.create({
        id: 'bp-bucket',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Bucket',
      });

      const c = AwsS3.satisfy(bp.component)
        .withBucket('prod-bucket')
        .withAcl('public-read')
        .withForceDestroy(false)
        .withVersioningEnabled(true)
        .withObjectLockEnabled(true)
        .build();

      expect(c.parameters.getOptionalFieldByName('bucket')).toBe(
        'prod-bucket'
      );
      expect(c.parameters.getOptionalFieldByName('acl')).toBe('public-read');
      expect(c.parameters.getOptionalFieldByName('forceDestroy')).toBe(false);
      expect(c.parameters.getOptionalFieldByName('versioningEnabled')).toBe(
        true
      );
      expect(c.parameters.getOptionalFieldByName('objectLockEnabled')).toBe(
        true
      );
    });
  });
});
