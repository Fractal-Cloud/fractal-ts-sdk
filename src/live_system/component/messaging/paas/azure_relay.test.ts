import {describe, expect, it} from 'vitest';
import {AzureRelay} from './azure_relay';
import {Broker} from '../../../../fractal/component/messaging/paas/broker';

const BASE_CONFIG = {
  id: 'my-relay',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Relay',
  azureRegion: 'eastus',
  azureResourceGroup: 'my-rg',
};

describe('AzureRelay', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureRelay.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Messaging.PaaS.Relay');
    });

    it('should set provider to Azure', () => {
      const c = AzureRelay.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set required parameters', () => {
      const c = AzureRelay.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('azureRegion')).toBe(
        'eastus',
      );
      expect(c.parameters.getOptionalFieldByName('azureResourceGroup')).toBe(
        'my-rg',
      );
    });

    it('should set optional parameters', () => {
      const c = AzureRelay.create({
        ...BASE_CONFIG,
        sku: 'Standard',
      });
      expect(c.parameters.getOptionalFieldByName('sku')).toBe('Standard');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = Broker.create({
        id: 'bp-relay',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Relay',
      });

      const c = AzureRelay.satisfy(bp.broker)
        .withAzureRegion('westus')
        .withAzureResourceGroup('bp-rg')
        .build();

      expect(c.id.toString()).toBe('bp-relay');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Relay');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = Broker.create({
        id: 'bp-relay',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Relay',
      });

      const c = AzureRelay.satisfy(bp.broker)
        .withAzureRegion('eastus')
        .withAzureResourceGroup('rg')
        .build();

      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
