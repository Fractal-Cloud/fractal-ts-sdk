import {describe, expect, it} from 'vitest';
import {GcpDatalake} from './gcp_datalake';
import {Datalake} from '../../../../fractal/component/big_data/paas/datalake';

const BASE_CONFIG = {
  id: 'my-datalake',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Datalake',
};

describe('GcpDatalake', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpDatalake.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('BigData.PaaS.CloudStorage');
    });

    it('should set provider to GCP', () => {
      const c = GcpDatalake.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should set optional parameters when provided', () => {
      const c = GcpDatalake.create({
        ...BASE_CONFIG,
        bucketName: 'my-bucket',
        region: 'us-central1',
        storageClass: 'NEARLINE',
        versioningEnabled: true,
        uniformBucketLevelAccess: true,
      });
      expect(c.parameters.getOptionalFieldByName('bucketName')).toBe(
        'my-bucket'
      );
      expect(c.parameters.getOptionalFieldByName('region')).toBe(
        'us-central1'
      );
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
      const c = GcpDatalake.create(BASE_CONFIG);
      expect(
        c.parameters.getOptionalFieldByName('bucketName')
      ).toBeNull();
      expect(c.parameters.getOptionalFieldByName('region')).toBeNull();
      expect(
        c.parameters.getOptionalFieldByName('storageClass')
      ).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {component: blueprint} = Datalake.create({
        id: 'bp-datalake',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Datalake',
      });

      const c = GcpDatalake.satisfy(blueprint).build();

      expect(c.id.toString()).toBe('bp-datalake');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Datalake');
    });

    it('should carry dependencies and links from blueprint', () => {
      const {component: blueprint} = Datalake.create({
        id: 'bp-datalake',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Datalake',
      });

      const c = GcpDatalake.satisfy(blueprint).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
