import {describe, expect, it} from 'vitest';
import {RelationalDbms} from './relational_dbms';
import {RelationalDatabase} from './relational_database';

const BASE_CONFIG = {
  id: 'my-dbms',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My DBMS',
};

describe('RelationalDbms', () => {
  describe('create()', () => {
    it('should build with correct type string', () => {
      const node = RelationalDbms.create(BASE_CONFIG);
      expect(node.dbms.type.toString()).toBe('Storage.PaaS.RelationalDbms');
    });

    it('should set id and displayName', () => {
      const node = RelationalDbms.create(BASE_CONFIG);
      expect(node.dbms.id.toString()).toBe('my-dbms');
      expect(node.dbms.displayName).toBe('My DBMS');
    });

    it('should set description when provided', () => {
      const node = RelationalDbms.create({
        ...BASE_CONFIG,
        description: 'PostgreSQL',
      });
      expect(node.dbms.description).toBe('PostgreSQL');
    });

    it('should set dbVersion parameter', () => {
      const node = RelationalDbms.create({...BASE_CONFIG, dbVersion: '15'});
      expect(node.dbms.parameters.getOptionalFieldByName('version')).toBe(
        '15',
      );
    });

    it('should start with no databases', () => {
      const node = RelationalDbms.create(BASE_CONFIG);
      expect(node.databases).toHaveLength(0);
    });
  });

  describe('withDatabases()', () => {
    it('should auto-wire the dbms as a dependency of each database', () => {
      const db1 = RelationalDatabase.create({
        id: 'app-db',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'App DB',
      });
      const db2 = RelationalDatabase.create({
        id: 'auth-db',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Auth DB',
      });

      const node = RelationalDbms.create(BASE_CONFIG).withDatabases([
        db1,
        db2,
      ]);

      expect(node.databases).toHaveLength(2);
      for (const wired of node.databases) {
        const depIds = wired.component.dependencies.map(d => d.id.toString());
        expect(depIds).toContain('my-dbms');
      }
    });

    it('should be immutable', () => {
      const db = RelationalDatabase.create({
        id: 'app-db',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'App DB',
      });
      const original = RelationalDbms.create(BASE_CONFIG);
      const withDbs = original.withDatabases([db]);
      expect(original.databases).toHaveLength(0);
      expect(withDbs.databases).toHaveLength(1);
    });
  });

  describe('getBuilder()', () => {
    it('should build via fluent builder', () => {
      const c = RelationalDbms.getBuilder()
        .withId('dbms-b')
        .withVersion(2, 0, 0)
        .withDisplayName('DBMS B')
        .build();
      expect(c.type.toString()).toBe('Storage.PaaS.RelationalDbms');
      expect(c.id.toString()).toBe('dbms-b');
    });
  });
});
