import {describe, expect, it} from 'vitest';
import {KeyValueDbms} from './key_value_dbms';
import {KeyValueEntity} from './key_value_entity';

const BASE_CONFIG = {
  id: 'my-kvdb',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My KV Store',
};

describe('KeyValueDbms', () => {
  describe('create()', () => {
    it('should build with correct type string', () => {
      const node = KeyValueDbms.create(BASE_CONFIG);
      expect(node.dbms.type.toString()).toBe('Storage.PaaS.KeyValueDbms');
    });

    it('should set id and displayName', () => {
      const node = KeyValueDbms.create(BASE_CONFIG);
      expect(node.dbms.id.toString()).toBe('my-kvdb');
      expect(node.dbms.displayName).toBe('My KV Store');
    });

    it('should set description when provided', () => {
      const node = KeyValueDbms.create({
        ...BASE_CONFIG,
        description: 'Redis-compatible',
      });
      expect(node.dbms.description).toBe('Redis-compatible');
    });

    it('should start with no entities', () => {
      const node = KeyValueDbms.create(BASE_CONFIG);
      expect(node.entities).toHaveLength(0);
    });
  });

  describe('withEntities()', () => {
    it('should auto-wire the dbms as a dependency of each entity', () => {
      const e1 = KeyValueEntity.create({
        id: 'session-cache',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Session Cache',
      });
      const e2 = KeyValueEntity.create({
        id: 'rate-limiter',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Rate Limiter',
      });

      const node = KeyValueDbms.create(BASE_CONFIG).withEntities([e1, e2]);

      expect(node.entities).toHaveLength(2);
      for (const wired of node.entities) {
        const depIds = wired.component.dependencies.map(d => d.id.toString());
        expect(depIds).toContain('my-kvdb');
      }
    });

    it('should be immutable', () => {
      const e = KeyValueEntity.create({
        id: 'session-cache',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Session Cache',
      });
      const original = KeyValueDbms.create(BASE_CONFIG);
      const withEntities = original.withEntities([e]);
      expect(original.entities).toHaveLength(0);
      expect(withEntities.entities).toHaveLength(1);
    });
  });

  describe('getBuilder()', () => {
    it('should build via fluent builder', () => {
      const c = KeyValueDbms.getBuilder()
        .withId('kvdb-b')
        .withVersion(2, 0, 0)
        .withDisplayName('KVDB B')
        .build();
      expect(c.type.toString()).toBe('Storage.PaaS.KeyValueDbms');
      expect(c.id.toString()).toBe('kvdb-b');
    });
  });
});
