import {describe, expect, it} from 'vitest';
import {AzureCosmosDbTable} from './azure_cosmosdb_table';
import {KeyValueEntity} from '../../../../fractal/component/storage/paas/key_value_entity';

const BASE_CONFIG = {
  id: 'my-table',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Table',
};

describe('AzureCosmosDbTable', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureCosmosDbTable.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.CosmosDbTable');
    });

    it('should set provider to Azure', () => {
      const c = AzureCosmosDbTable.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set id and displayName', () => {
      const c = AzureCosmosDbTable.create({
        ...BASE_CONFIG,
        description: 'A CosmosDB table',
      });
      expect(c.id.toString()).toBe('my-table');
      expect(c.displayName).toBe('My Table');
      expect(c.description).toBe('A CosmosDB table');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = KeyValueEntity.create({
        id: 'bp-table',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Table',
      });

      const c = AzureCosmosDbTable.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-table');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Table');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = KeyValueEntity.create({
        id: 'bp-table',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Table',
      });

      const c = AzureCosmosDbTable.satisfy(bp.component).build();

      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
