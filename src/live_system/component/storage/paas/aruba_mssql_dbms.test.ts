import {describe, expect, it} from 'vitest';
import {ArubaMsSqlDbms} from './aruba_mssql_dbms';
import {
  RelationalDbms,
  VERSION_PARAM,
} from '../../../../fractal/component/storage/paas/relational_dbms';

const BASE_CONFIG = {
  id: 'my-mssql',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My MS SQL',
};

describe('ArubaMsSqlDbms', () => {
  describe('create()', () => {
    it('should build with the correct type string', () => {
      const c = ArubaMsSqlDbms.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.ArubaMsSqlDbms');
    });

    it('should set provider to Aruba', () => {
      const c = ArubaMsSqlDbms.create(BASE_CONFIG);
      expect(c.provider).toBe('Aruba');
    });

    it('should set flavorName and dbVersion when provided', () => {
      const c = ArubaMsSqlDbms.create({
        ...BASE_CONFIG,
        flavorName: 'DBO1A2',
        dbVersion: '2022',
      });
      expect(c.parameters.getOptionalFieldByName('flavorName')).toBe('DBO1A2');
      expect(c.parameters.getOptionalFieldByName(VERSION_PARAM)).toBe('2022');
    });
  });

  describe('satisfy()', () => {
    it('should carry blueprint id and version param', () => {
      const bp = RelationalDbms.create({
        id: 'bp-mssql',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint MS SQL',
        dbVersion: '2022',
      });

      const c = ArubaMsSqlDbms.satisfy(bp.dbms).build();
      expect(c.id.toString()).toBe('bp-mssql');
      expect(c.parameters.getOptionalFieldByName(VERSION_PARAM)).toBe('2022');
    });

    it('should allow flavorName on the sealed builder', () => {
      const bp = RelationalDbms.create({
        id: 'bp-mssql',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint MS SQL',
      });

      const c = ArubaMsSqlDbms.satisfy(bp.dbms)
        .withFlavorName('DBO1A2')
        .build();
      expect(c.parameters.getOptionalFieldByName('flavorName')).toBe('DBO1A2');
    });
  });
});
