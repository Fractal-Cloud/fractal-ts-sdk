import {describe, expect, it} from 'vitest';
import {MessagingEntity} from './entity';

const BASE_CONFIG = {
  id: 'my-entity',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Entity',
};

describe('MessagingEntity (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = MessagingEntity.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('Messaging.PaaS.Entity');
    });

    it('should set id, version, and displayName', () => {
      const {component} = MessagingEntity.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-entity');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My Entity');
    });

    it('should set description when provided', () => {
      const {component} = MessagingEntity.create({
        ...BASE_CONFIG,
        description: 'A messaging entity',
      });
      expect(component.description).toBe('A messaging entity');
    });

    it('should not set description when omitted', () => {
      const {component} = MessagingEntity.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });

    it('should set messageRetentionHours parameter', () => {
      const {component} = MessagingEntity.create({
        ...BASE_CONFIG,
        messageRetentionHours: 48,
      });
      expect(
        component.parameters.getOptionalFieldByName('messageRetentionHours'),
      ).toBe(48);
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = MessagingEntity.getBuilder()
        .withId('entity-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Entity A')
        .build();

      expect(c.type.toString()).toBe('Messaging.PaaS.Entity');
      expect(c.id.toString()).toBe('entity-a');
    });
  });
});
