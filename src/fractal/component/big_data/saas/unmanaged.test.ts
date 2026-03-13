import {describe, expect, it} from 'vitest';
import {BigDataUnmanaged} from './unmanaged';

const BASE_CONFIG = {
  id: 'my-unmanaged',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Unmanaged',
};

describe('BigDataUnmanaged (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = BigDataUnmanaged.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('BigData.SaaS.Unmanaged');
    });

    it('should set id, version, and displayName', () => {
      const {component} = BigDataUnmanaged.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-unmanaged');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Unmanaged');
    });

    it('should set description when provided', () => {
      const {component} = BigDataUnmanaged.create({
        ...BASE_CONFIG,
        description: 'External big data service',
      });
      expect(component.description).toBe('External big data service');
    });

    it('should not set description when omitted', () => {
      const {component} = BigDataUnmanaged.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = BigDataUnmanaged.getBuilder()
        .withId('unmanaged-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Unmanaged A')
        .build();

      expect(c.type.toString()).toBe('BigData.SaaS.Unmanaged');
      expect(c.id.toString()).toBe('unmanaged-a');
    });
  });
});
