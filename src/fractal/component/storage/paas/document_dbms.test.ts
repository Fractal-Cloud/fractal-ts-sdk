import {describe, expect, it} from 'vitest';
import {DocumentDbms} from './document_dbms';
import {DocumentDatabase} from './document_database';

const BASE_CONFIG = {
  id: 'my-docdb',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Document DB',
};

describe('DocumentDbms', () => {
  describe('create()', () => {
    it('should build with correct type string', () => {
      const node = DocumentDbms.create(BASE_CONFIG);
      expect(node.dbms.type.toString()).toBe('Storage.PaaS.DocumentDbms');
    });

    it('should set id and displayName', () => {
      const node = DocumentDbms.create(BASE_CONFIG);
      expect(node.dbms.id.toString()).toBe('my-docdb');
      expect(node.dbms.displayName).toBe('My Document DB');
    });

    it('should set description when provided', () => {
      const node = DocumentDbms.create({
        ...BASE_CONFIG,
        description: 'MongoDB-compatible',
      });
      expect(node.dbms.description).toBe('MongoDB-compatible');
    });

    it('should start with no databases', () => {
      const node = DocumentDbms.create(BASE_CONFIG);
      expect(node.databases).toHaveLength(0);
    });
  });

  describe('withDatabases()', () => {
    it('should auto-wire the dbms as a dependency of each database', () => {
      const db1 = DocumentDatabase.create({
        id: 'users-db',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Users DB',
      });
      const db2 = DocumentDatabase.create({
        id: 'orders-db',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Orders DB',
      });

      const node = DocumentDbms.create(BASE_CONFIG).withDatabases([db1, db2]);

      expect(node.databases).toHaveLength(2);
      for (const wired of node.databases) {
        const depIds = wired.component.dependencies.map(d => d.id.toString());
        expect(depIds).toContain('my-docdb');
      }
    });

    it('should be immutable', () => {
      const db = DocumentDatabase.create({
        id: 'users-db',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Users DB',
      });
      const original = DocumentDbms.create(BASE_CONFIG);
      const withDbs = original.withDatabases([db]);
      expect(original.databases).toHaveLength(0);
      expect(withDbs.databases).toHaveLength(1);
    });
  });

  describe('getBuilder()', () => {
    it('should build via fluent builder', () => {
      const c = DocumentDbms.getBuilder()
        .withId('docdb-b')
        .withVersion(2, 0, 0)
        .withDisplayName('DocDB B')
        .build();
      expect(c.type.toString()).toBe('Storage.PaaS.DocumentDbms');
      expect(c.id.toString()).toBe('docdb-b');
    });
  });
});
