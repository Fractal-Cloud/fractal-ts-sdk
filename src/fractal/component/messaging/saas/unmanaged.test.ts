import {describe, expect, it} from 'vitest';
import {MessagingUnmanaged} from './unmanaged';

const BASE_CONFIG = {
  id: 'my-unmanaged',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Unmanaged',
};

describe('MessagingUnmanaged (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = MessagingUnmanaged.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('Messaging.SaaS.Unmanaged');
    });

    it('should set id, version, and displayName', () => {
      const {component} = MessagingUnmanaged.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-unmanaged');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Unmanaged');
    });

    it('should set description when provided', () => {
      const {component} = MessagingUnmanaged.create({
        ...BASE_CONFIG,
        description: 'External messaging',
      });
      expect(component.description).toBe('External messaging');
    });

    it('should not set description when omitted', () => {
      const {component} = MessagingUnmanaged.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = MessagingUnmanaged.getBuilder()
        .withId('unmanaged-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Unmanaged A')
        .build();

      expect(c.type.toString()).toBe('Messaging.SaaS.Unmanaged');
      expect(c.id.toString()).toBe('unmanaged-a');
    });
  });
});
