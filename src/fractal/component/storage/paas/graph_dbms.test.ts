import {describe, expect, it} from 'vitest';
import {GraphDbms} from './graph_dbms';
import {GraphDatabase} from './graph_database';

const BASE_CONFIG = {
  id: 'my-graphdb',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Graph DB',
};

describe('GraphDbms', () => {
  describe('create()', () => {
    it('should build with correct type string', () => {
      const node = GraphDbms.create(BASE_CONFIG);
      expect(node.dbms.type.toString()).toBe('Storage.PaaS.GraphDbms');
    });

    it('should set id and displayName', () => {
      const node = GraphDbms.create(BASE_CONFIG);
      expect(node.dbms.id.toString()).toBe('my-graphdb');
      expect(node.dbms.displayName).toBe('My Graph DB');
    });

    it('should set description when provided', () => {
      const node = GraphDbms.create({
        ...BASE_CONFIG,
        description: 'Neo4j-compatible',
      });
      expect(node.dbms.description).toBe('Neo4j-compatible');
    });

    it('should start with no databases', () => {
      const node = GraphDbms.create(BASE_CONFIG);
      expect(node.databases).toHaveLength(0);
    });
  });

  describe('withDatabases()', () => {
    it('should auto-wire the dbms as a dependency of each database', () => {
      const db1 = GraphDatabase.create({
        id: 'social-graph',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Social Graph',
      });
      const db2 = GraphDatabase.create({
        id: 'knowledge-graph',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Knowledge Graph',
      });

      const node = GraphDbms.create(BASE_CONFIG).withDatabases([db1, db2]);

      expect(node.databases).toHaveLength(2);
      for (const wired of node.databases) {
        const depIds = wired.component.dependencies.map(d => d.id.toString());
        expect(depIds).toContain('my-graphdb');
      }
    });

    it('should be immutable', () => {
      const db = GraphDatabase.create({
        id: 'social-graph',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Social Graph',
      });
      const original = GraphDbms.create(BASE_CONFIG);
      const withDbs = original.withDatabases([db]);
      expect(original.databases).toHaveLength(0);
      expect(withDbs.databases).toHaveLength(1);
    });
  });

  describe('getBuilder()', () => {
    it('should build via fluent builder', () => {
      const c = GraphDbms.getBuilder()
        .withId('graphdb-b')
        .withVersion(2, 0, 0)
        .withDisplayName('GraphDB B')
        .build();
      expect(c.type.toString()).toBe('Storage.PaaS.GraphDbms');
      expect(c.id.toString()).toBe('graphdb-b');
    });
  });
});
