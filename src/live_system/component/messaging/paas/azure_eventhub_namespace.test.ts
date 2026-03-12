import {describe, expect, it} from 'vitest';
import {AzureEventHubNamespace} from './azure_eventhub_namespace';
import {Broker} from '../../../../fractal/component/messaging/paas/broker';

const BASE_CONFIG = {
  id: 'my-ehns',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My EventHub Namespace',
  azureRegion: 'eastus',
  azureResourceGroup: 'my-rg',
};

describe('AzureEventHubNamespace', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureEventHubNamespace.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Messaging.PaaS.EventHubNamespace');
    });

    it('should set provider to Azure', () => {
      const c = AzureEventHubNamespace.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set required parameters', () => {
      const c = AzureEventHubNamespace.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('azureRegion')).toBe(
        'eastus',
      );
      expect(c.parameters.getOptionalFieldByName('azureResourceGroup')).toBe(
        'my-rg',
      );
    });

    it('should set optional parameters', () => {
      const c = AzureEventHubNamespace.create({
        ...BASE_CONFIG,
        kafkaEnabled: true,
        autoInflateEnabled: true,
        maximumThroughputUnits: 20,
        minimumTlsVersion: '1.2',
        publicNetworkAccess: 'Enabled',
        skuName: 'Standard',
        skuTier: 'Standard',
        skuCapacity: 2,
        zoneRedundant: true,
      });
      expect(c.parameters.getOptionalFieldByName('kafkaEnabled')).toBe(true);
      expect(c.parameters.getOptionalFieldByName('autoInflateEnabled')).toBe(
        true,
      );
      expect(
        c.parameters.getOptionalFieldByName('maximumThroughputUnits'),
      ).toBe(20);
      expect(c.parameters.getOptionalFieldByName('minimumTlsVersion')).toBe(
        '1.2',
      );
      expect(c.parameters.getOptionalFieldByName('publicNetworkAccess')).toBe(
        'Enabled',
      );
      expect(c.parameters.getOptionalFieldByName('skuName')).toBe('Standard');
      expect(c.parameters.getOptionalFieldByName('skuTier')).toBe('Standard');
      expect(c.parameters.getOptionalFieldByName('skuCapacity')).toBe(2);
      expect(c.parameters.getOptionalFieldByName('zoneRedundant')).toBe(true);
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = Broker.create({
        id: 'bp-ehns',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint EHNS',
      });

      const c = AzureEventHubNamespace.satisfy(bp.broker)
        .withAzureRegion('westus')
        .withAzureResourceGroup('bp-rg')
        .build();

      expect(c.id.toString()).toBe('bp-ehns');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint EHNS');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = Broker.create({
        id: 'bp-ehns',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint EHNS',
      });

      const c = AzureEventHubNamespace.satisfy(bp.broker)
        .withAzureRegion('eastus')
        .withAzureResourceGroup('rg')
        .build();

      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
