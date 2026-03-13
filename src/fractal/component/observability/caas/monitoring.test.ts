import {describe, expect, it} from 'vitest';
import {Monitoring} from './monitoring';

const BASE_CONFIG = {
  id: 'my-monitoring',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Monitoring',
};

describe('Monitoring (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = Monitoring.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('Observability.CaaS.Monitoring');
    });

    it('should set id, version, and displayName', () => {
      const {component} = Monitoring.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-monitoring');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Monitoring');
    });

    it('should set description when provided', () => {
      const {component} = Monitoring.create({
        ...BASE_CONFIG,
        description: 'CaaS Monitoring',
      });
      expect(component.description).toBe('CaaS Monitoring');
    });

    it('should not set description when omitted', () => {
      const {component} = Monitoring.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = Monitoring.getBuilder()
        .withId('mon-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Mon A')
        .build();

      expect(c.type.toString()).toBe('Observability.CaaS.Monitoring');
      expect(c.id.toString()).toBe('mon-a');
    });
  });
});
