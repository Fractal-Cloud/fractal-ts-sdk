import {describe, expect, it} from 'vitest';
import {AzureEventHub} from './azure_eventhub';
import {MessagingEntity} from '../../../../fractal/component/messaging/paas/entity';

const BASE_CONFIG = {
  id: 'my-eh',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My EventHub',
  azureRegion: 'eastus',
  azureResourceGroup: 'my-rg',
};

describe('AzureEventHub', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureEventHub.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Messaging.PaaS.EventHub');
    });

    it('should set provider to Azure', () => {
      const c = AzureEventHub.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set required parameters', () => {
      const c = AzureEventHub.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('azureRegion')).toBe(
        'eastus',
      );
      expect(c.parameters.getOptionalFieldByName('azureResourceGroup')).toBe(
        'my-rg',
      );
    });

    it('should set optional parameters', () => {
      const c = AzureEventHub.create({
        ...BASE_CONFIG,
        partitionCount: 4,
        messageRetentionInDays: 7,
      });
      expect(c.parameters.getOptionalFieldByName('partitionCount')).toBe(4);
      expect(
        c.parameters.getOptionalFieldByName('messageRetentionInDays'),
      ).toBe(7);
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = MessagingEntity.create({
        id: 'bp-eh',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint EH',
      });

      const c = AzureEventHub.satisfy(bp.component)
        .withAzureRegion('westus')
        .withAzureResourceGroup('bp-rg')
        .build();

      expect(c.id.toString()).toBe('bp-eh');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint EH');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = MessagingEntity.create({
        id: 'bp-eh',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint EH',
      });

      const c = AzureEventHub.satisfy(bp.component)
        .withAzureRegion('eastus')
        .withAzureResourceGroup('rg')
        .build();

      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
