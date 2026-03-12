import {describe, expect, it} from 'vitest';
import {Unmanaged} from './unmanaged';

const BASE_CONFIG = {
  id: 'my-external',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My External Store',
};

describe('Unmanaged (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = Unmanaged.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('Storage.SaaS.Unmanaged');
    });

    it('should set id, version, and displayName', () => {
      const {component} = Unmanaged.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-external');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My External Store');
    });

    it('should set description when provided', () => {
      const {component} = Unmanaged.create({
        ...BASE_CONFIG,
        description: 'External storage',
      });
      expect(component.description).toBe('External storage');
    });

    it('should not set description when omitted', () => {
      const {component} = Unmanaged.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = Unmanaged.getBuilder()
        .withId('ext-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Ext A')
        .build();

      expect(c.type.toString()).toBe('Storage.SaaS.Unmanaged');
      expect(c.id.toString()).toBe('ext-a');
    });
  });
});
