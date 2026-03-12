import {describe, expect, it} from 'vitest';
import {Kafka} from './kafka';
import {CaaSBroker} from '../../../../fractal/component/messaging/caas/broker';

const BASE_CONFIG = {
  id: 'my-kafka',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Kafka',
};

describe('Kafka', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = Kafka.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Messaging.CaaS.Kafka');
    });

    it('should set provider to CaaS', () => {
      const c = Kafka.create(BASE_CONFIG);
      expect(c.provider).toBe('CaaS');
    });

    it('should set vendor-specific parameters', () => {
      const c = Kafka.create({
        ...BASE_CONFIG,
        namespace: 'messaging',
        clusterName: 'main-cluster',
      });
      expect(c.parameters.getOptionalFieldByName('namespace')).toBe(
        'messaging'
      );
      expect(c.parameters.getOptionalFieldByName('clusterName')).toBe(
        'main-cluster'
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = CaaSBroker.create({
        id: 'bp-broker',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Broker',
      });

      const c = Kafka.satisfy(bp.broker).build();

      expect(c.id.toString()).toBe('bp-broker');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Broker');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = CaaSBroker.create({
        id: 'bp-broker',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Broker',
      });

      const c = Kafka.satisfy(bp.broker).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should allow setting vendor-specific params via satisfied builder', () => {
      const bp = CaaSBroker.create({
        id: 'bp-broker',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Broker',
      });

      const c = Kafka.satisfy(bp.broker)
        .withNamespace('streaming')
        .withClusterName('prod-cluster')
        .build();

      expect(c.parameters.getOptionalFieldByName('namespace')).toBe(
        'streaming'
      );
      expect(c.parameters.getOptionalFieldByName('clusterName')).toBe(
        'prod-cluster'
      );
    });
  });
});
