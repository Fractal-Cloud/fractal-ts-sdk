import {describe, expect, it} from 'vitest';
import {AzureBlobContainer} from './azure_blob_container';
import {FilesAndBlobs} from '../../../../fractal/component/storage/paas/files_and_blobs';

const BASE_CONFIG = {
  id: 'my-blob',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Blob Container',
  azureRegion: 'eastus',
  azureResourceGroup: 'my-rg',
};

describe('AzureBlobContainer', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureBlobContainer.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.StorageBlobContainer');
    });

    it('should set provider to Azure', () => {
      const c = AzureBlobContainer.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set required parameters', () => {
      const c = AzureBlobContainer.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('azureRegion')).toBe(
        'eastus',
      );
      expect(c.parameters.getOptionalFieldByName('azureResourceGroup')).toBe(
        'my-rg',
      );
    });

    it('should set optional parameters', () => {
      const c = AzureBlobContainer.create({
        ...BASE_CONFIG,
        publicAccess: 'Blob',
      });
      expect(c.parameters.getOptionalFieldByName('publicAccess')).toBe('Blob');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = FilesAndBlobs.create({
        id: 'bp-blob',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Blob',
      });

      const c = AzureBlobContainer.satisfy(bp.component)
        .withAzureRegion('westus')
        .withAzureResourceGroup('bp-rg')
        .build();

      expect(c.id.toString()).toBe('bp-blob');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Blob');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = FilesAndBlobs.create({
        id: 'bp-blob',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Blob',
      });

      const c = AzureBlobContainer.satisfy(bp.component)
        .withAzureRegion('eastus')
        .withAzureResourceGroup('rg')
        .build();

      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
