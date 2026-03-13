import {describe, expect, it} from 'vitest';
import {GcpDatabricks} from './gcp_databricks';
import {DistributedDataProcessing} from '../../../../fractal/component/big_data/paas/distributed_data_processing';

const BASE_CONFIG = {
  id: 'my-databricks',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Databricks',
};

describe('GcpDatabricks', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpDatabricks.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('BigData.PaaS.Databricks');
    });

    it('should set provider to GCP', () => {
      const c = GcpDatabricks.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should set optional networkId parameter when provided', () => {
      const c = GcpDatabricks.create({
        ...BASE_CONFIG,
        networkId: 'projects/my-project/global/networks/my-vpc',
      });
      expect(c.parameters.getOptionalFieldByName('networkId')).toBe(
        'projects/my-project/global/networks/my-vpc'
      );
    });

    it('should not set optional params when omitted', () => {
      const c = GcpDatabricks.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('networkId')).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const ddp = DistributedDataProcessing.create({
        id: 'bp-databricks',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Databricks',
      });

      const c = GcpDatabricks.satisfy(ddp.platform).build();

      expect(c.id.toString()).toBe('bp-databricks');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Databricks');
    });

    it('should set pricingTier via satisfied builder', () => {
      const ddp = DistributedDataProcessing.create({
        id: 'bp-databricks',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Databricks',
      });

      const c = GcpDatabricks.satisfy(ddp.platform)
        .withPricingTier('PREMIUM')
        .build();
      expect(c.parameters.getOptionalFieldByName('pricingTier')).toBe(
        'PREMIUM'
      );
    });

    it('should carry dependencies and links from blueprint', () => {
      const ddp = DistributedDataProcessing.create({
        id: 'bp-databricks',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Databricks',
      });

      const c = GcpDatabricks.satisfy(ddp.platform).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
