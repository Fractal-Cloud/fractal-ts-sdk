import {describe, expect, it} from 'vitest';
import {ColumnOrientedEntity} from './column_oriented_entity';

const BASE_CONFIG = {
  id: 'my-column-store',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Column Store',
};

describe('ColumnOrientedEntity (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = ColumnOrientedEntity.create(BASE_CONFIG);
      expect(component.type.toString()).toBe(
        'Storage.PaaS.ColumnOrientedEntity',
      );
    });

    it('should set id, version, and displayName', () => {
      const {component} = ColumnOrientedEntity.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-column-store');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Column Store');
    });

    it('should set description when provided', () => {
      const {component} = ColumnOrientedEntity.create({
        ...BASE_CONFIG,
        description: 'Wide-column store',
      });
      expect(component.description).toBe('Wide-column store');
    });

    it('should not set description when omitted', () => {
      const {component} = ColumnOrientedEntity.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = ColumnOrientedEntity.getBuilder()
        .withId('col-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Col A')
        .build();

      expect(c.type.toString()).toBe('Storage.PaaS.ColumnOrientedEntity');
      expect(c.id.toString()).toBe('col-a');
    });
  });
});
