import {describe, expect, it} from 'vitest';
import {ObservabilityUnmanaged} from './unmanaged';

const BASE_CONFIG = {
  id: 'my-unmanaged',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Unmanaged',
};

describe('ObservabilityUnmanaged (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = ObservabilityUnmanaged.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('Observability.SaaS.Unmanaged');
    });

    it('should set id, version, and displayName', () => {
      const {component} = ObservabilityUnmanaged.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-unmanaged');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Unmanaged');
    });

    it('should set description when provided', () => {
      const {component} = ObservabilityUnmanaged.create({
        ...BASE_CONFIG,
        description: 'SaaS Unmanaged Observability',
      });
      expect(component.description).toBe('SaaS Unmanaged Observability');
    });

    it('should not set description when omitted', () => {
      const {component} = ObservabilityUnmanaged.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = ObservabilityUnmanaged.getBuilder()
        .withId('obs-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Obs A')
        .build();

      expect(c.type.toString()).toBe('Observability.SaaS.Unmanaged');
      expect(c.id.toString()).toBe('obs-a');
    });
  });
});
