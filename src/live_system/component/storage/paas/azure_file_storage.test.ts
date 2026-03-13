import {describe, expect, it} from 'vitest';
import {AzureFileStorage} from './azure_file_storage';
import {FilesAndBlobs} from '../../../../fractal/component/storage/paas/files_and_blobs';

const BASE_CONFIG = {
  id: 'my-files',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My File Storage',
  azureRegion: 'eastus',
  azureResourceGroup: 'my-rg',
};

describe('AzureFileStorage', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureFileStorage.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.FileStorage');
    });

    it('should set provider to Azure', () => {
      const c = AzureFileStorage.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set required parameters', () => {
      const c = AzureFileStorage.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('azureRegion')).toBe(
        'eastus',
      );
      expect(c.parameters.getOptionalFieldByName('azureResourceGroup')).toBe(
        'my-rg',
      );
    });

    it('should set optional parameters', () => {
      const c = AzureFileStorage.create({
        ...BASE_CONFIG,
        accessTier: 'Hot',
        shareQuota: 100,
      });
      expect(c.parameters.getOptionalFieldByName('accessTier')).toBe('Hot');
      expect(c.parameters.getOptionalFieldByName('shareQuota')).toBe(100);
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = FilesAndBlobs.create({
        id: 'bp-files',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Files',
      });

      const c = AzureFileStorage.satisfy(bp.component)
        .withAzureRegion('westus')
        .withAzureResourceGroup('bp-rg')
        .build();

      expect(c.id.toString()).toBe('bp-files');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Files');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = FilesAndBlobs.create({
        id: 'bp-files',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Files',
      });

      const c = AzureFileStorage.satisfy(bp.component)
        .withAzureRegion('eastus')
        .withAzureResourceGroup('rg')
        .build();

      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
