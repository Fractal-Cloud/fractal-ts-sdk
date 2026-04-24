import {describe, expect, it} from 'vitest';
import {ArubaObjectStorageAccount} from './aruba_object_storage_account';
import {FilesAndBlobs} from '../../../../fractal/component/storage/paas/files_and_blobs';

const BASE_CONFIG = {
  id: 'my-account',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Object Storage',
  password: 'StrongPass123',
};

describe('ArubaObjectStorageAccount', () => {
  describe('create()', () => {
    it('should build with the correct type string', () => {
      const c = ArubaObjectStorageAccount.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'Storage.PaaS.ArubaObjectStorageAccount',
      );
    });

    it('should set provider to Aruba', () => {
      const c = ArubaObjectStorageAccount.create(BASE_CONFIG);
      expect(c.provider).toBe('Aruba');
    });

    it('should set required password and optional account/region params', () => {
      const c = ArubaObjectStorageAccount.create({
        ...BASE_CONFIG,
        accountName: 'fct-acct',
        regionCode: 'it',
      });
      expect(c.parameters.getOptionalFieldByName('password')).toBe(
        'StrongPass123',
      );
      expect(c.parameters.getOptionalFieldByName('accountName')).toBe(
        'fct-acct',
      );
      expect(c.parameters.getOptionalFieldByName('regionCode')).toBe('it');
    });
  });

  describe('satisfy()', () => {
    it('should copy blueprint id/version and expose vendor params', () => {
      const bp = FilesAndBlobs.create({
        id: 'bp-files',
        version: {major: 2, minor: 0, patch: 0},
        displayName: 'Blueprint Files',
      });

      const c = ArubaObjectStorageAccount.satisfy(bp.component)
        .withPassword('StrongPass123')
        .withAccountName('fct-acct')
        .withRegionCode('it')
        .build();

      expect(c.id.toString()).toBe('bp-files');
      expect(c.version.major).toBe(2);
      expect(c.parameters.getOptionalFieldByName('password')).toBe(
        'StrongPass123',
      );
      expect(c.parameters.getOptionalFieldByName('accountName')).toBe(
        'fct-acct',
      );
      expect(c.parameters.getOptionalFieldByName('regionCode')).toBe('it');
    });
  });
});
