import {describe, expect, it} from 'vitest';
import {CaaSBroker} from './broker';
import {CaaSMessagingEntity} from './entity';

const BASE_CONFIG = {
  id: 'my-caas-broker',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My CaaS Broker',
};

describe('CaaSBroker (blueprint)', () => {
  describe('create()', () => {
    it('should build with correct type string', () => {
      const node = CaaSBroker.create(BASE_CONFIG);
      expect(node.broker.type.toString()).toBe('Messaging.CaaS.Broker');
    });

    it('should set id and displayName', () => {
      const node = CaaSBroker.create(BASE_CONFIG);
      expect(node.broker.id.toString()).toBe('my-caas-broker');
      expect(node.broker.displayName).toBe('My CaaS Broker');
    });

    it('should set description when provided', () => {
      const node = CaaSBroker.create({
        ...BASE_CONFIG,
        description: 'CaaS message broker',
      });
      expect(node.broker.description).toBe('CaaS message broker');
    });

    it('should start with no entities', () => {
      const node = CaaSBroker.create(BASE_CONFIG);
      expect(node.entities).toHaveLength(0);
    });
  });

  describe('withEntities()', () => {
    it('should auto-wire the broker as a dependency of each entity', () => {
      const e1 = CaaSMessagingEntity.create({
        id: 'topic-a',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Topic A',
      });
      const e2 = CaaSMessagingEntity.create({
        id: 'queue-a',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Queue A',
      });

      const node = CaaSBroker.create(BASE_CONFIG).withEntities([e1, e2]);

      expect(node.entities).toHaveLength(2);
      for (const wired of node.entities) {
        const depIds = wired.component.dependencies.map(d => d.id.toString());
        expect(depIds).toContain('my-caas-broker');
      }
    });

    it('should preserve existing dependencies on entities', () => {
      const entity = CaaSMessagingEntity.create({
        id: 'topic-b',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Topic B',
      });

      const node = CaaSBroker.create(BASE_CONFIG).withEntities([entity]);

      expect(node.entities[0].component.dependencies.length).toBeGreaterThanOrEqual(1);
    });

    it('should be immutable', () => {
      const entity = CaaSMessagingEntity.create({
        id: 'topic-c',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Topic C',
      });
      const original = CaaSBroker.create(BASE_CONFIG);
      const withEntities = original.withEntities([entity]);
      expect(original.entities).toHaveLength(0);
      expect(withEntities.entities).toHaveLength(1);
    });
  });

  describe('getBuilder()', () => {
    it('should build via fluent builder', () => {
      const c = CaaSBroker.getBuilder()
        .withId('broker-b')
        .withVersion(2, 0, 0)
        .withDisplayName('Broker B')
        .build();
      expect(c.type.toString()).toBe('Messaging.CaaS.Broker');
      expect(c.id.toString()).toBe('broker-b');
    });
  });
});
