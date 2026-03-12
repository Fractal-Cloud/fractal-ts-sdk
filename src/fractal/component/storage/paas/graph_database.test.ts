import {describe, expect, it} from 'vitest';
import {GraphDatabase} from './graph_database';

const BASE_CONFIG = {
  id: 'my-graphdb',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Graph DB',
};

describe('GraphDatabase (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = GraphDatabase.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('Storage.PaaS.GraphDatabase');
    });

    it('should set id, version, and displayName', () => {
      const {component} = GraphDatabase.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-graphdb');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Graph DB');
    });

    it('should set description when provided', () => {
      const {component} = GraphDatabase.create({
        ...BASE_CONFIG,
        description: 'Graph store',
      });
      expect(component.description).toBe('Graph store');
    });

    it('should not set description when omitted', () => {
      const {component} = GraphDatabase.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = GraphDatabase.getBuilder()
        .withId('graph-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Graph A')
        .build();

      expect(c.type.toString()).toBe('Storage.PaaS.GraphDatabase');
      expect(c.id.toString()).toBe('graph-a');
    });
  });
});
