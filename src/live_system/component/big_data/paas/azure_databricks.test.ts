import {describe, expect, it} from 'vitest';
import {AzureDatabricks} from './azure_databricks';
import {DistributedDataProcessing} from '../../../../fractal/component/big_data/paas/distributed_data_processing';

const BASE_CONFIG = {
  id: 'my-databricks',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Databricks',
};

describe('AzureDatabricks', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureDatabricks.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('BigData.PaaS.Databricks');
    });

    it('should set provider to Azure', () => {
      const c = AzureDatabricks.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set vendor parameters', () => {
      const c = AzureDatabricks.create({
        ...BASE_CONFIG,
        managedResourceGroupName: 'my-mrg',
        enableNoPublicIp: true,
      });
      expect(
        c.parameters.getOptionalFieldByName('managedResourceGroupName'),
      ).toBe('my-mrg');
      expect(c.parameters.getOptionalFieldByName('enableNoPublicIp')).toBe(
        true,
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = DistributedDataProcessing.create({
        id: 'bp-databricks',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Databricks',
      });

      const c = AzureDatabricks.satisfy(bp.platform)
        .withManagedResourceGroupName('mrg')
        .build();

      expect(c.id.toString()).toBe('bp-databricks');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Databricks');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = DistributedDataProcessing.create({
        id: 'bp-databricks',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Databricks',
      });

      const c = AzureDatabricks.satisfy(bp.platform).build();

      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should carry pricingTier from blueprint', () => {
      const bp = DistributedDataProcessing.create({
        id: 'bp-databricks',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Databricks',
        pricingTier: 'premium',
      });

      const c = AzureDatabricks.satisfy(bp.platform).build();

      expect(c.parameters.getOptionalFieldByName('pricingTier')).toBe(
        'premium',
      );
    });
  });
});
