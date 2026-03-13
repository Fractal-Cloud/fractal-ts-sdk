import {describe, expect, it} from 'vitest';
import {AzureDatalake} from './azure_datalake';
import {Datalake} from '../../../../fractal/component/big_data/paas/datalake';

const BASE_CONFIG = {
  id: 'my-datalake',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Datalake',
  azureRegion: 'eastus',
  azureResourceGroup: 'my-rg',
};

describe('AzureDatalake', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureDatalake.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('BigData.PaaS.StorageAccount');
    });

    it('should set provider to Azure', () => {
      const c = AzureDatalake.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set vendor parameters', () => {
      const c = AzureDatalake.create(BASE_CONFIG);
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
      const bp = Datalake.create({
        id: 'bp-datalake',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Datalake',
      });

      const c = AzureDatalake.satisfy(bp.component)
        .withAzureRegion('westus')
        .withAzureResourceGroup('bp-rg')
        .build();

      expect(c.id.toString()).toBe('bp-datalake');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Datalake');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = Datalake.create({
        id: 'bp-datalake',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Datalake',
      });

      const c = AzureDatalake.satisfy(bp.component)
        .withAzureRegion('eastus')
        .withAzureResourceGroup('rg')
        .build();

      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
