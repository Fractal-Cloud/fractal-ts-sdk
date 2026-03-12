import {describe, expect, it} from 'vitest';
import {AzureCosmosDbAccount} from './azure_cosmosdb_account';
import {DocumentDbms} from '../../../../fractal/component/storage/paas/document_dbms';

const BASE_CONFIG = {
  id: 'my-cosmos',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My CosmosDB',
  azureRegion: 'eastus',
  azureResourceGroup: 'my-rg',
};

describe('AzureCosmosDbAccount', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureCosmosDbAccount.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.CosmosDbAccount');
    });

    it('should set provider to Azure', () => {
      const c = AzureCosmosDbAccount.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set required parameters', () => {
      const c = AzureCosmosDbAccount.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('azureRegion')).toBe(
        'eastus',
      );
      expect(c.parameters.getOptionalFieldByName('azureResourceGroup')).toBe(
        'my-rg',
      );
    });

    it('should set optional parameters', () => {
      const c = AzureCosmosDbAccount.create({
        ...BASE_CONFIG,
        maxTotalThroughput: 4000,
        publicNetworkAccess: 'Enabled',
      });
      expect(c.parameters.getOptionalFieldByName('maxTotalThroughput')).toBe(
        4000,
      );
      expect(c.parameters.getOptionalFieldByName('publicNetworkAccess')).toBe(
        'Enabled',
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = DocumentDbms.create({
        id: 'bp-cosmos',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Cosmos',
      });

      const c = AzureCosmosDbAccount.satisfy(bp.dbms)
        .withAzureRegion('westus')
        .withAzureResourceGroup('bp-rg')
        .build();

      expect(c.id.toString()).toBe('bp-cosmos');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Cosmos');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = DocumentDbms.create({
        id: 'bp-cosmos',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Cosmos',
      });

      const c = AzureCosmosDbAccount.satisfy(bp.dbms)
        .withAzureRegion('eastus')
        .withAzureResourceGroup('rg')
        .build();

      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
