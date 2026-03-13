import {describe, expect, it} from 'vitest';
import {ApiManagementUnmanaged} from './unmanaged';

const BASE_CONFIG = {
  id: 'my-external',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My External API',
};

describe('ApiManagementUnmanaged (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = ApiManagementUnmanaged.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('APIManagement.SaaS.Unmanaged');
    });

    it('should set id, version, and displayName', () => {
      const {component} = ApiManagementUnmanaged.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-external');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My External API');
    });

    it('should set description when provided', () => {
      const {component} = ApiManagementUnmanaged.create({
        ...BASE_CONFIG,
        description: 'External API management',
      });
      expect(component.description).toBe('External API management');
    });

    it('should not set description when omitted', () => {
      const {component} = ApiManagementUnmanaged.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = ApiManagementUnmanaged.getBuilder()
        .withId('ext-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Ext A')
        .build();

      expect(c.type.toString()).toBe('APIManagement.SaaS.Unmanaged');
      expect(c.id.toString()).toBe('ext-a');
    });
  });
});
