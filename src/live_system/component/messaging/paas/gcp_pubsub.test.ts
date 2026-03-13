import {describe, expect, it} from 'vitest';
import {GcpPubSub} from './gcp_pubsub';
import {Broker} from '../../../../fractal/component/messaging/paas/broker';

const BASE_CONFIG = {
  id: 'my-pubsub',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My PubSub',
};

describe('GcpPubSub', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpPubSub.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Messaging.PaaS.PubSub');
    });

    it('should set provider to GCP', () => {
      const c = GcpPubSub.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = Broker.create({
        id: 'bp-broker',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Broker',
      });

      const c = GcpPubSub.satisfy(bp.broker).build();

      expect(c.id.toString()).toBe('bp-broker');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Broker');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = Broker.create({
        id: 'bp-broker',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Broker',
      });

      const c = GcpPubSub.satisfy(bp.broker).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
