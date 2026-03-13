import {describe, expect, it} from 'vitest';
import {CaaSMessagingEntity} from './entity';

const BASE_CONFIG = {
  id: 'my-caas-entity',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My CaaS Entity',
};

describe('CaaSMessagingEntity (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = CaaSMessagingEntity.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('Messaging.CaaS.Entity');
    });

    it('should set id, version, and displayName', () => {
      const {component} = CaaSMessagingEntity.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-caas-entity');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My CaaS Entity');
    });

    it('should set description when provided', () => {
      const {component} = CaaSMessagingEntity.create({
        ...BASE_CONFIG,
        description: 'A CaaS messaging entity',
      });
      expect(component.description).toBe('A CaaS messaging entity');
    });

    it('should not set description when omitted', () => {
      const {component} = CaaSMessagingEntity.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = CaaSMessagingEntity.getBuilder()
        .withId('entity-a')
        .withVersion(2, 0, 0)
        .withDisplayName('Entity A')
        .build();

      expect(c.type.toString()).toBe('Messaging.CaaS.Entity');
      expect(c.id.toString()).toBe('entity-a');
    });
  });
});
