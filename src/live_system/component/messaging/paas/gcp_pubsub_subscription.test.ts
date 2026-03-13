import {describe, expect, it} from 'vitest';
import {GcpPubSubSubscription} from './gcp_pubsub_subscription';
import {MessagingEntity} from '../../../../fractal/component/messaging/paas/entity';

const BASE_CONFIG = {
  id: 'my-subscription',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Subscription',
};

describe('GcpPubSubSubscription', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpPubSubSubscription.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Messaging.PaaS.Subscription');
    });

    it('should set provider to GCP', () => {
      const c = GcpPubSubSubscription.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = MessagingEntity.create({
        id: 'bp-entity',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Entity',
      });

      const c = GcpPubSubSubscription.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-entity');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Entity');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = MessagingEntity.create({
        id: 'bp-entity',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Entity',
      });

      const c = GcpPubSubSubscription.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
