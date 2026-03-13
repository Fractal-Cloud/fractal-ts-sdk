import {describe, expect, it} from 'vitest';
import {AwsS3Datalake} from './aws_s3_datalake';
import {Datalake} from '../../../../fractal/component/big_data/paas/datalake';

const BASE_CONFIG = {
  id: 'my-datalake',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Datalake',
};

describe('AwsS3Datalake', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AwsS3Datalake.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('BigData.PaaS.S3');
    });

    it('should set provider to AWS', () => {
      const c = AwsS3Datalake.create(BASE_CONFIG);
      expect(c.provider).toBe('AWS');
    });

    it('should set vendor-specific parameters', () => {
      const c = AwsS3Datalake.create({
        ...BASE_CONFIG,
        bucket: 'my-datalake-bucket',
        versioning: true,
        forceDestroy: false,
      });
      expect(c.parameters.getOptionalFieldByName('bucket')).toBe(
        'my-datalake-bucket'
      );
      expect(c.parameters.getOptionalFieldByName('versioning')).toBe(true);
      expect(c.parameters.getOptionalFieldByName('forceDestroy')).toBe(false);
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = Datalake.create({
        id: 'bp-datalake',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Datalake',
      });

      const c = AwsS3Datalake.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-datalake');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Datalake');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = Datalake.create({
        id: 'bp-datalake',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Datalake',
      });

      const c = AwsS3Datalake.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should allow setting vendor-specific params via satisfied builder', () => {
      const bp = Datalake.create({
        id: 'bp-datalake',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Datalake',
      });

      const c = AwsS3Datalake.satisfy(bp.component)
        .withBucket('prod-datalake')
        .withVersioning(true)
        .withForceDestroy(false)
        .build();

      expect(c.parameters.getOptionalFieldByName('bucket')).toBe(
        'prod-datalake'
      );
      expect(c.parameters.getOptionalFieldByName('versioning')).toBe(true);
      expect(c.parameters.getOptionalFieldByName('forceDestroy')).toBe(false);
    });
  });
});
