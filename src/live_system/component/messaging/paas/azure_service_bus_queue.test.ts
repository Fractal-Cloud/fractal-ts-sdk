import {describe, expect, it} from 'vitest';
import {AzureServiceBusQueue} from './azure_service_bus_queue';
import {MessagingEntity} from '../../../../fractal/component/messaging/paas/entity';

const BASE_CONFIG = {
  id: 'my-queue',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Queue',
  azureRegion: 'eastus',
  azureResourceGroup: 'my-rg',
};

describe('AzureServiceBusQueue', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureServiceBusQueue.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Messaging.PaaS.ServiceBusQueue');
    });

    it('should set provider to Azure', () => {
      const c = AzureServiceBusQueue.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set required parameters', () => {
      const c = AzureServiceBusQueue.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('azureRegion')).toBe(
        'eastus',
      );
      expect(c.parameters.getOptionalFieldByName('azureResourceGroup')).toBe(
        'my-rg',
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = MessagingEntity.create({
        id: 'bp-queue',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Queue',
      });

      const c = AzureServiceBusQueue.satisfy(bp.component)
        .withAzureRegion('westus')
        .withAzureResourceGroup('bp-rg')
        .build();

      expect(c.id.toString()).toBe('bp-queue');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Queue');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = MessagingEntity.create({
        id: 'bp-queue',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Queue',
      });

      const c = AzureServiceBusQueue.satisfy(bp.component)
        .withAzureRegion('eastus')
        .withAzureResourceGroup('rg')
        .build();

      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
