import {describe, expect, it} from 'vitest';
import {AzureStorageAccount} from './azure_storage_account';
import {FilesAndBlobs} from '../../../../fractal/component/storage/paas/files_and_blobs';

const BASE_CONFIG = {
  id: 'my-storage',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Storage Account',
  azureRegion: 'eastus',
  azureResourceGroup: 'my-rg',
};

describe('AzureStorageAccount', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureStorageAccount.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.StorageAccount');
    });

    it('should set provider to Azure', () => {
      const c = AzureStorageAccount.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set required parameters', () => {
      const c = AzureStorageAccount.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('azureRegion')).toBe(
        'eastus',
      );
      expect(c.parameters.getOptionalFieldByName('azureResourceGroup')).toBe(
        'my-rg',
      );
    });

    it('should set optional parameters', () => {
      const c = AzureStorageAccount.create({
        ...BASE_CONFIG,
        kind: 'StorageV2',
        sku: 'Standard_LRS',
        accessTier: 'Hot',
      });
      expect(c.parameters.getOptionalFieldByName('kind')).toBe('StorageV2');
      expect(c.parameters.getOptionalFieldByName('sku')).toBe('Standard_LRS');
      expect(c.parameters.getOptionalFieldByName('accessTier')).toBe('Hot');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = FilesAndBlobs.create({
        id: 'bp-storage',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Storage',
      });

      const c = AzureStorageAccount.satisfy(bp.component)
        .withAzureRegion('westus')
        .withAzureResourceGroup('bp-rg')
        .build();

      expect(c.id.toString()).toBe('bp-storage');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Storage');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = FilesAndBlobs.create({
        id: 'bp-storage',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Storage',
      });

      const c = AzureStorageAccount.satisfy(bp.component)
        .withAzureRegion('eastus')
        .withAzureResourceGroup('rg')
        .build();

      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
