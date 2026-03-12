import {describe, expect, it} from 'vitest';
import {KafkaTopic} from './kafka_topic';
import {CaaSMessagingEntity} from '../../../../fractal/component/messaging/caas/entity';

const BASE_CONFIG = {
  id: 'my-topic',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Kafka Topic',
};

describe('KafkaTopic', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = KafkaTopic.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Messaging.CaaS.KafkaTopic');
    });

    it('should set provider to CaaS', () => {
      const c = KafkaTopic.create(BASE_CONFIG);
      expect(c.provider).toBe('CaaS');
    });

    it('should set vendor-specific parameters', () => {
      const c = KafkaTopic.create({
        ...BASE_CONFIG,
        namespace: 'streaming',
      });
      expect(c.parameters.getOptionalFieldByName('namespace')).toBe(
        'streaming'
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = CaaSMessagingEntity.create({
        id: 'bp-entity',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Entity',
      });

      const c = KafkaTopic.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-entity');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Entity');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = CaaSMessagingEntity.create({
        id: 'bp-entity',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Entity',
      });

      const c = KafkaTopic.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should allow setting vendor-specific params via satisfied builder', () => {
      const bp = CaaSMessagingEntity.create({
        id: 'bp-entity',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Entity',
      });

      const c = KafkaTopic.satisfy(bp.component)
        .withNamespace('events')
        .build();

      expect(c.parameters.getOptionalFieldByName('namespace')).toBe('events');
    });
  });
});
