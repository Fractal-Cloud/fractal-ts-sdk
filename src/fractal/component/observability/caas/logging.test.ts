import {describe, expect, it} from 'vitest';
import {Logging} from './logging';

const BASE_CONFIG = {
  id: 'my-logging',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Logging',
};

describe('Logging (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = Logging.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('Observability.CaaS.Logging');
    });

    it('should set id, version, and displayName', () => {
      const {component} = Logging.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-logging');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Logging');
    });

    it('should set description when provided', () => {
      const {component} = Logging.create({
        ...BASE_CONFIG,
        description: 'CaaS Logging',
      });
      expect(component.description).toBe('CaaS Logging');
    });

    it('should not set description when omitted', () => {
      const {component} = Logging.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = Logging.getBuilder()
        .withId('log-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Log A')
        .build();

      expect(c.type.toString()).toBe('Observability.CaaS.Logging');
      expect(c.id.toString()).toBe('log-a');
    });
  });
});
