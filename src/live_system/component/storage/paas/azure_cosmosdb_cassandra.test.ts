import {describe, expect, it} from 'vitest';
import {AzureCosmosDbCassandra} from './azure_cosmosdb_cassandra';
import {ColumnOrientedDbms} from '../../../../fractal/component/storage/paas/column_oriented_dbms';

const BASE_CONFIG = {
  id: 'my-cassandra',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Cassandra',
  azureRegion: 'eastus',
  azureResourceGroup: 'my-rg',
};

describe('AzureCosmosDbCassandra', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureCosmosDbCassandra.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.CosmosDbCassandra');
    });

    it('should set provider to Azure', () => {
      const c = AzureCosmosDbCassandra.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set required parameters', () => {
      const c = AzureCosmosDbCassandra.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('azureRegion')).toBe(
        'eastus',
      );
      expect(c.parameters.getOptionalFieldByName('azureResourceGroup')).toBe(
        'my-rg',
      );
    });

    it('should set optional parameters', () => {
      const c = AzureCosmosDbCassandra.create({
        ...BASE_CONFIG,
        cassandraVersion: 'v4',
        hoursBetweenBackups: 8,
      });
      expect(c.parameters.getOptionalFieldByName('cassandraVersion')).toBe(
        'v4',
      );
      expect(c.parameters.getOptionalFieldByName('hoursBetweenBackups')).toBe(
        8,
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = ColumnOrientedDbms.create({
        id: 'bp-cassandra',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Cassandra',
      });

      const c = AzureCosmosDbCassandra.satisfy(bp.dbms)
        .withAzureRegion('westus')
        .withAzureResourceGroup('bp-rg')
        .build();

      expect(c.id.toString()).toBe('bp-cassandra');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Cassandra');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = ColumnOrientedDbms.create({
        id: 'bp-cassandra',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Cassandra',
      });

      const c = AzureCosmosDbCassandra.satisfy(bp.dbms)
        .withAzureRegion('eastus')
        .withAzureResourceGroup('rg')
        .build();

      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
