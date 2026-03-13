import {describe, expect, it} from 'vitest';
import {AzureCosmosDbPostgreSqlDatabase} from './azure_cosmosdb_postgresql_database';
import {RelationalDatabase} from '../../../../fractal/component/storage/paas/relational_database';

const BASE_CONFIG = {
  id: 'my-cosmos-pg',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My CosmosDB PostgreSQL',
};

describe('AzureCosmosDbPostgreSqlDatabase', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureCosmosDbPostgreSqlDatabase.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'Storage.PaaS.CosmosDbPostgreSqlDatabase',
      );
    });

    it('should set provider to Azure', () => {
      const c = AzureCosmosDbPostgreSqlDatabase.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set optional parameters', () => {
      const c = AzureCosmosDbPostgreSqlDatabase.create({
        ...BASE_CONFIG,
        collation: 'en_US.utf8',
        charset: 'UTF8',
      });
      expect(c.parameters.getOptionalFieldByName('collation')).toBe(
        'en_US.utf8',
      );
      expect(c.parameters.getOptionalFieldByName('charset')).toBe('UTF8');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = RelationalDatabase.create({
        id: 'bp-cosmos-pg',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint CosmosDB PG',
      });

      const c = AzureCosmosDbPostgreSqlDatabase.satisfy(
        bp.component,
      ).build();

      expect(c.id.toString()).toBe('bp-cosmos-pg');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint CosmosDB PG');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = RelationalDatabase.create({
        id: 'bp-cosmos-pg',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint CosmosDB PG',
      });

      const c = AzureCosmosDbPostgreSqlDatabase.satisfy(
        bp.component,
      ).build();

      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
