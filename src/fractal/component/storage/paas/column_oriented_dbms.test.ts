import {describe, expect, it} from 'vitest';
import {ColumnOrientedDbms} from './column_oriented_dbms';
import {ColumnOrientedEntity} from './column_oriented_entity';

const BASE_CONFIG = {
  id: 'my-coldb',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Column DB',
};

describe('ColumnOrientedDbms', () => {
  describe('create()', () => {
    it('should build with correct type string', () => {
      const node = ColumnOrientedDbms.create(BASE_CONFIG);
      expect(node.dbms.type.toString()).toBe(
        'Storage.PaaS.ColumnOrientedDbms',
      );
    });

    it('should set id and displayName', () => {
      const node = ColumnOrientedDbms.create(BASE_CONFIG);
      expect(node.dbms.id.toString()).toBe('my-coldb');
      expect(node.dbms.displayName).toBe('My Column DB');
    });

    it('should set description when provided', () => {
      const node = ColumnOrientedDbms.create({
        ...BASE_CONFIG,
        description: 'Cassandra-compatible',
      });
      expect(node.dbms.description).toBe('Cassandra-compatible');
    });

    it('should start with no entities', () => {
      const node = ColumnOrientedDbms.create(BASE_CONFIG);
      expect(node.entities).toHaveLength(0);
    });
  });

  describe('withEntities()', () => {
    it('should auto-wire the dbms as a dependency of each entity', () => {
      const e1 = ColumnOrientedEntity.create({
        id: 'events-table',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Events Table',
      });
      const e2 = ColumnOrientedEntity.create({
        id: 'metrics-table',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Metrics Table',
      });

      const node = ColumnOrientedDbms.create(BASE_CONFIG).withEntities([
        e1,
        e2,
      ]);

      expect(node.entities).toHaveLength(2);
      for (const wired of node.entities) {
        const depIds = wired.component.dependencies.map(d => d.id.toString());
        expect(depIds).toContain('my-coldb');
      }
    });

    it('should be immutable', () => {
      const e = ColumnOrientedEntity.create({
        id: 'events-table',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Events Table',
      });
      const original = ColumnOrientedDbms.create(BASE_CONFIG);
      const withEntities = original.withEntities([e]);
      expect(original.entities).toHaveLength(0);
      expect(withEntities.entities).toHaveLength(1);
    });
  });

  describe('getBuilder()', () => {
    it('should build via fluent builder', () => {
      const c = ColumnOrientedDbms.getBuilder()
        .withId('coldb-b')
        .withVersion(2, 0, 0)
        .withDisplayName('ColDB B')
        .build();
      expect(c.type.toString()).toBe('Storage.PaaS.ColumnOrientedDbms');
      expect(c.id.toString()).toBe('coldb-b');
    });
  });
});
