import {describe, expect, it} from 'vitest';
import {AzureCosmosDbGremlinDatabase} from './azure_cosmosdb_gremlin';
import {GraphDatabase} from '../../../../fractal/component/storage/paas/graph_database';

const BASE_CONFIG = {
  id: 'my-gremlin',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Gremlin Database',
};

describe('AzureCosmosDbGremlinDatabase', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureCosmosDbGremlinDatabase.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.CosmosDbGremlinDatabase');
    });

    it('should set provider to Azure', () => {
      const c = AzureCosmosDbGremlinDatabase.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set id and displayName', () => {
      const c = AzureCosmosDbGremlinDatabase.create({
        ...BASE_CONFIG,
        description: 'A Gremlin database',
      });
      expect(c.id.toString()).toBe('my-gremlin');
      expect(c.displayName).toBe('My Gremlin Database');
      expect(c.description).toBe('A Gremlin database');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = GraphDatabase.create({
        id: 'bp-gremlin',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Gremlin',
      });

      const c = AzureCosmosDbGremlinDatabase.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-gremlin');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Gremlin');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = GraphDatabase.create({
        id: 'bp-gremlin',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Gremlin',
      });

      const c = AzureCosmosDbGremlinDatabase.satisfy(bp.component).build();

      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
