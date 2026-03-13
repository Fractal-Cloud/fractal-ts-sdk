import {describe, expect, it} from 'vitest';
import {SearchEntity} from './search_entity';

const BASE_CONFIG = {
  id: 'my-search',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Search',
};

describe('SearchEntity (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = SearchEntity.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('Storage.CaaS.SearchEntity');
    });

    it('should set id, version, and displayName', () => {
      const {component} = SearchEntity.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-search');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Search');
    });

    it('should set description when provided', () => {
      const {component} = SearchEntity.create({
        ...BASE_CONFIG,
        description: 'Search engine',
      });
      expect(component.description).toBe('Search engine');
    });

    it('should not set description when omitted', () => {
      const {component} = SearchEntity.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = SearchEntity.getBuilder()
        .withId('search-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Search A')
        .build();

      expect(c.type.toString()).toBe('Storage.CaaS.SearchEntity');
      expect(c.id.toString()).toBe('search-a');
    });
  });
});
