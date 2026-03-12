import {describe, expect, it} from 'vitest';
import {AzureServiceBus} from './azure_service_bus';
import {Broker} from '../../../../fractal/component/messaging/paas/broker';

const BASE_CONFIG = {
  id: 'my-bus',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Service Bus',
  azureRegion: 'eastus',
  azureResourceGroup: 'my-rg',
};

describe('AzureServiceBus', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureServiceBus.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Messaging.PaaS.ServiceBus');
    });

    it('should set provider to Azure', () => {
      const c = AzureServiceBus.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set required parameters', () => {
      const c = AzureServiceBus.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('azureRegion')).toBe(
        'eastus',
      );
      expect(c.parameters.getOptionalFieldByName('azureResourceGroup')).toBe(
        'my-rg',
      );
    });

    it('should set optional parameters', () => {
      const c = AzureServiceBus.create({
        ...BASE_CONFIG,
        sku: 'Premium',
      });
      expect(c.parameters.getOptionalFieldByName('sku')).toBe('Premium');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = Broker.create({
        id: 'bp-bus',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Bus',
      });

      const c = AzureServiceBus.satisfy(bp.broker)
        .withAzureRegion('westus')
        .withAzureResourceGroup('bp-rg')
        .build();

      expect(c.id.toString()).toBe('bp-bus');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Bus');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = Broker.create({
        id: 'bp-bus',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Bus',
      });

      const c = AzureServiceBus.satisfy(bp.broker)
        .withAzureRegion('eastus')
        .withAzureResourceGroup('rg')
        .build();

      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
