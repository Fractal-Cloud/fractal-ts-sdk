import {describe, expect, it} from 'vitest';
import {Tracing} from './tracing';

const BASE_CONFIG = {
  id: 'my-tracing',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Tracing',
};

describe('Tracing (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = Tracing.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('Observability.CaaS.Tracing');
    });

    it('should set id, version, and displayName', () => {
      const {component} = Tracing.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-tracing');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Tracing');
    });

    it('should set description when provided', () => {
      const {component} = Tracing.create({
        ...BASE_CONFIG,
        description: 'CaaS Tracing',
      });
      expect(component.description).toBe('CaaS Tracing');
    });

    it('should not set description when omitted', () => {
      const {component} = Tracing.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = Tracing.getBuilder()
        .withId('trc-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Trc A')
        .build();

      expect(c.type.toString()).toBe('Observability.CaaS.Tracing');
      expect(c.id.toString()).toBe('trc-a');
    });
  });
});
