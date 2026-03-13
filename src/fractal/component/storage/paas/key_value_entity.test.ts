import {describe, expect, it} from 'vitest';
import {KeyValueEntity} from './key_value_entity';

const BASE_CONFIG = {
  id: 'my-kv-store',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My KV Store',
};

describe('KeyValueEntity (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = KeyValueEntity.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('Storage.PaaS.KeyValueEntity');
    });

    it('should set id, version, and displayName', () => {
      const {component} = KeyValueEntity.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-kv-store');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My KV Store');
    });

    it('should set description when provided', () => {
      const {component} = KeyValueEntity.create({
        ...BASE_CONFIG,
        description: 'Key-value cache',
      });
      expect(component.description).toBe('Key-value cache');
    });

    it('should not set description when omitted', () => {
      const {component} = KeyValueEntity.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = KeyValueEntity.getBuilder()
        .withId('kv-a')
        .withVersion(2, 0, 0)
        .withDisplayName('KV A')
        .build();

      expect(c.type.toString()).toBe('Storage.PaaS.KeyValueEntity');
      expect(c.id.toString()).toBe('kv-a');
    });
  });
});
