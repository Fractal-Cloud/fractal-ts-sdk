import {describe, expect, it} from 'vitest';
import {AwsDatabricks} from './aws_databricks';
import {DistributedDataProcessing} from '../../../../fractal/component/big_data/paas/distributed_data_processing';

const BASE_CONFIG = {
  id: 'my-workspace',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Databricks Workspace',
};

describe('AwsDatabricks', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AwsDatabricks.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('BigData.PaaS.Databricks');
    });

    it('should set provider to AWS', () => {
      const c = AwsDatabricks.create(BASE_CONFIG);
      expect(c.provider).toBe('AWS');
    });

    it('should set vendor-specific parameters', () => {
      const c = AwsDatabricks.create({
        ...BASE_CONFIG,
        credentialsId: 'cred-123',
        storageConfigurationId: 'storage-456',
        networkId: 'net-789',
      });
      expect(c.parameters.getOptionalFieldByName('credentialsId')).toBe(
        'cred-123'
      );
      expect(
        c.parameters.getOptionalFieldByName('storageConfigurationId')
      ).toBe('storage-456');
      expect(c.parameters.getOptionalFieldByName('networkId')).toBe(
        'net-789'
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = DistributedDataProcessing.create({
        id: 'bp-workspace',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Workspace',
      });

      const c = AwsDatabricks.satisfy(bp.platform).build();

      expect(c.id.toString()).toBe('bp-workspace');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Workspace');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = DistributedDataProcessing.create({
        id: 'bp-workspace',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Workspace',
      });

      const c = AwsDatabricks.satisfy(bp.platform).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should set pricingTier via satisfied builder', () => {
      const bp = DistributedDataProcessing.create({
        id: 'bp-workspace',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Workspace',
      });

      const c = AwsDatabricks.satisfy(bp.platform)
        .withPricingTier('PREMIUM')
        .build();
      expect(c.parameters.getOptionalFieldByName('pricingTier')).toBe(
        'PREMIUM'
      );
    });

    it('should allow setting vendor-specific params via satisfied builder', () => {
      const bp = DistributedDataProcessing.create({
        id: 'bp-workspace',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Workspace',
      });

      const c = AwsDatabricks.satisfy(bp.platform)
        .withCredentialsId('cred-abc')
        .withStorageConfigurationId('storage-def')
        .withNetworkId('net-ghi')
        .build();

      expect(c.parameters.getOptionalFieldByName('credentialsId')).toBe(
        'cred-abc'
      );
      expect(
        c.parameters.getOptionalFieldByName('storageConfigurationId')
      ).toBe('storage-def');
      expect(c.parameters.getOptionalFieldByName('networkId')).toBe(
        'net-ghi'
      );
    });
  });
});
