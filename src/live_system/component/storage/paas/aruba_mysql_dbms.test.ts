import {describe, expect, it} from 'vitest';
import {ArubaMySqlDbms} from './aruba_mysql_dbms';
import {
  RelationalDbms,
  VERSION_PARAM,
} from '../../../../fractal/component/storage/paas/relational_dbms';

const BASE_CONFIG = {
  id: 'my-mysql',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My MySQL',
};

describe('ArubaMySqlDbms', () => {
  describe('create()', () => {
    it('should build with the correct type string', () => {
      const c = ArubaMySqlDbms.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.ArubaMySqlDbms');
    });

    it('should set provider to Aruba', () => {
      const c = ArubaMySqlDbms.create(BASE_CONFIG);
      expect(c.provider).toBe('Aruba');
    });

    it('should set flavorName and dbVersion when provided', () => {
      const c = ArubaMySqlDbms.create({
        ...BASE_CONFIG,
        flavorName: 'DBO1A2',
        dbVersion: '8.0',
      });
      expect(c.parameters.getOptionalFieldByName('flavorName')).toBe('DBO1A2');
      expect(c.parameters.getOptionalFieldByName(VERSION_PARAM)).toBe('8.0');
    });
  });

  describe('satisfy()', () => {
    it('should carry blueprint id and version param', () => {
      const bp = RelationalDbms.create({
        id: 'bp-mysql',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint MySQL',
        dbVersion: '8.0',
      });

      const c = ArubaMySqlDbms.satisfy(bp.dbms).build();
      expect(c.id.toString()).toBe('bp-mysql');
      expect(c.parameters.getOptionalFieldByName(VERSION_PARAM)).toBe('8.0');
    });

    it('should allow flavorName on the sealed builder', () => {
      const bp = RelationalDbms.create({
        id: 'bp-mysql',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint MySQL',
      });

      const c = ArubaMySqlDbms.satisfy(bp.dbms)
        .withFlavorName('DBO1A2')
        .build();
      expect(c.parameters.getOptionalFieldByName('flavorName')).toBe('DBO1A2');
    });
  });
});
