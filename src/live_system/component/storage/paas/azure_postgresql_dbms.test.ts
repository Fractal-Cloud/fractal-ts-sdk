import {describe, expect, it} from 'vitest';
import {AzurePostgreSqlDbms} from './azure_postgresql_dbms';
import {
  RelationalDbms,
  VERSION_PARAM,
} from '../../../../fractal/component/storage/paas/relational_dbms';

const BASE_CONFIG = {
  id: 'my-dbms',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My PostgreSQL',
  azureRegion: 'eastus',
  azureResourceGroup: 'my-rg',
};

describe('AzurePostgreSqlDbms', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzurePostgreSqlDbms.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.PostgreSqlDbms');
    });

    it('should set provider to Azure', () => {
      const c = AzurePostgreSqlDbms.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set required parameters', () => {
      const c = AzurePostgreSqlDbms.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('azureRegion')).toBe(
        'eastus',
      );
      expect(c.parameters.getOptionalFieldByName('azureResourceGroup')).toBe(
        'my-rg',
      );
    });

    it('should set optional parameters', () => {
      const c = AzurePostgreSqlDbms.create({
        ...BASE_CONFIG,
        dbVersion: '16',
        rootUser: 'admin',
        skuName: 'GP_Gen5_2',
        storageGb: 128,
        backupRetentionDays: 14,
      });
      expect(c.parameters.getOptionalFieldByName(VERSION_PARAM)).toBe('16');
      expect(c.parameters.getOptionalFieldByName('rootUser')).toBe('admin');
      expect(c.parameters.getOptionalFieldByName('skuName')).toBe('GP_Gen5_2');
      expect(c.parameters.getOptionalFieldByName('storageGb')).toBe(128);
      expect(c.parameters.getOptionalFieldByName('backupRetentionDays')).toBe(
        14,
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = RelationalDbms.create({
        id: 'bp-dbms',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint DBMS',
      });

      const c = AzurePostgreSqlDbms.satisfy(bp.dbms)
        .withAzureRegion('westus')
        .withAzureResourceGroup('bp-rg')
        .build();

      expect(c.id.toString()).toBe('bp-dbms');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint DBMS');
    });

    it('should carry blueprint version param', () => {
      const bp = RelationalDbms.create({
        id: 'bp-dbms',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint DBMS',
        dbVersion: '15',
      });

      const c = AzurePostgreSqlDbms.satisfy(bp.dbms)
        .withAzureRegion('eastus')
        .withAzureResourceGroup('rg')
        .build();

      expect(c.parameters.getOptionalFieldByName(VERSION_PARAM)).toBe('15');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = RelationalDbms.create({
        id: 'bp-dbms',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint DBMS',
      });

      const c = AzurePostgreSqlDbms.satisfy(bp.dbms)
        .withAzureRegion('eastus')
        .withAzureResourceGroup('rg')
        .build();

      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
