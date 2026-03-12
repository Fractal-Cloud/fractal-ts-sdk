import {describe, expect, it} from 'vitest';
import {Search} from './search';
import {SearchEntity} from './search_entity';

const BASE_CONFIG = {
  id: 'my-search',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Search',
};

describe('Search', () => {
  describe('create()', () => {
    it('should build with correct type string', () => {
      const node = Search.create(BASE_CONFIG);
      expect(node.search.type.toString()).toBe('Storage.CaaS.Search');
    });

    it('should set id and displayName', () => {
      const node = Search.create(BASE_CONFIG);
      expect(node.search.id.toString()).toBe('my-search');
      expect(node.search.displayName).toBe('My Search');
    });

    it('should set description when provided', () => {
      const node = Search.create({
        ...BASE_CONFIG,
        description: 'Elasticsearch-compatible',
      });
      expect(node.search.description).toBe('Elasticsearch-compatible');
    });

    it('should start with no entities', () => {
      const node = Search.create(BASE_CONFIG);
      expect(node.entities).toHaveLength(0);
    });
  });

  describe('withEntities()', () => {
    it('should auto-wire the search as a dependency of each entity', () => {
      const e1 = SearchEntity.create({
        id: 'products-index',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Products Index',
      });
      const e2 = SearchEntity.create({
        id: 'logs-index',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Logs Index',
      });

      const node = Search.create(BASE_CONFIG).withEntities([e1, e2]);

      expect(node.entities).toHaveLength(2);
      for (const wired of node.entities) {
        const depIds = wired.component.dependencies.map(d => d.id.toString());
        expect(depIds).toContain('my-search');
      }
    });

    it('should be immutable', () => {
      const e = SearchEntity.create({
        id: 'products-index',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Products Index',
      });
      const original = Search.create(BASE_CONFIG);
      const withEntities = original.withEntities([e]);
      expect(original.entities).toHaveLength(0);
      expect(withEntities.entities).toHaveLength(1);
    });
  });

  describe('getBuilder()', () => {
    it('should build via fluent builder', () => {
      const c = Search.getBuilder()
        .withId('search-b')
        .withVersion(2, 0, 0)
        .withDisplayName('Search B')
        .build();
      expect(c.type.toString()).toBe('Storage.CaaS.Search');
      expect(c.id.toString()).toBe('search-b');
    });
  });
});
