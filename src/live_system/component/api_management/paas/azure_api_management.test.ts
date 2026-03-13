import {describe, expect, it} from 'vitest';
import {AzureApiManagement} from './azure_api_management';
import {PaaSApiGateway} from '../../../../fractal/component/api_management/paas/api_gateway';

const BASE_CONFIG = {
  id: 'my-apim',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My API Management',
};

describe('AzureApiManagement', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureApiManagement.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('APIManagement.PaaS.ApiManagement');
    });

    it('should set provider to Azure', () => {
      const c = AzureApiManagement.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set vendor-specific parameters', () => {
      const c = AzureApiManagement.create({
        ...BASE_CONFIG,
        azureRegion: 'westeurope',
        azureResourceGroup: 'my-rg',
        publisherName: 'Contoso',
        publisherEmail: 'admin@contoso.com',
        skuName: 'Developer_1',
        publicNetworkAccessEnabled: false,
      });
      expect(c.parameters.getOptionalFieldByName('azureRegion')).toBe(
        'westeurope'
      );
      expect(
        c.parameters.getOptionalFieldByName('azureResourceGroup')
      ).toBe('my-rg');
      expect(c.parameters.getOptionalFieldByName('publisherName')).toBe(
        'Contoso'
      );
      expect(c.parameters.getOptionalFieldByName('publisherEmail')).toBe(
        'admin@contoso.com'
      );
      expect(c.parameters.getOptionalFieldByName('skuName')).toBe(
        'Developer_1'
      );
      expect(
        c.parameters.getOptionalFieldByName('publicNetworkAccessEnabled')
      ).toBe(false);
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = PaaSApiGateway.create({
        id: 'bp-apim',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint APIM',
      });

      const c = AzureApiManagement.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-apim');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint APIM');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = PaaSApiGateway.create({
        id: 'bp-apim',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint APIM',
      });

      const c = AzureApiManagement.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should allow setting vendor-specific params via satisfied builder', () => {
      const bp = PaaSApiGateway.create({
        id: 'bp-apim',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint APIM',
      });

      const c = AzureApiManagement.satisfy(bp.component)
        .withAzureRegion('eastus')
        .withAzureResourceGroup('prod-rg')
        .withPublisherName('Acme')
        .withPublisherEmail('api@acme.com')
        .withSkuName('Standard_1')
        .withPublicNetworkAccessEnabled(true)
        .build();

      expect(c.parameters.getOptionalFieldByName('azureRegion')).toBe(
        'eastus'
      );
      expect(
        c.parameters.getOptionalFieldByName('azureResourceGroup')
      ).toBe('prod-rg');
      expect(c.parameters.getOptionalFieldByName('publisherName')).toBe(
        'Acme'
      );
      expect(c.parameters.getOptionalFieldByName('publisherEmail')).toBe(
        'api@acme.com'
      );
      expect(c.parameters.getOptionalFieldByName('skuName')).toBe(
        'Standard_1'
      );
      expect(
        c.parameters.getOptionalFieldByName('publicNetworkAccessEnabled')
      ).toBe(true);
    });
  });
});
