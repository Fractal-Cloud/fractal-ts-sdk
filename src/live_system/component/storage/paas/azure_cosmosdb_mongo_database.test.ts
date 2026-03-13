import {describe, expect, it} from 'vitest';
import {AzureCosmosDbMongoDatabase} from './azure_cosmosdb_mongo_database';
import {DocumentDatabase} from '../../../../fractal/component/storage/paas/document_database';

const BASE_CONFIG = {
  id: 'my-mongo',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Mongo Database',
};

describe('AzureCosmosDbMongoDatabase', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureCosmosDbMongoDatabase.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.CosmosDbMongoDatabase');
    });

    it('should set provider to Azure', () => {
      const c = AzureCosmosDbMongoDatabase.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set id and displayName', () => {
      const c = AzureCosmosDbMongoDatabase.create({
        ...BASE_CONFIG,
        description: 'A Mongo database',
      });
      expect(c.id.toString()).toBe('my-mongo');
      expect(c.displayName).toBe('My Mongo Database');
      expect(c.description).toBe('A Mongo database');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = DocumentDatabase.create({
        id: 'bp-mongo',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Mongo',
      });

      const c = AzureCosmosDbMongoDatabase.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-mongo');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Mongo');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = DocumentDatabase.create({
        id: 'bp-mongo',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Mongo',
      });

      const c = AzureCosmosDbMongoDatabase.satisfy(bp.component).build();

      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
