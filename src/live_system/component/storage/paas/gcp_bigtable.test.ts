import {describe, expect, it} from 'vitest';
import {GcpBigTable} from './gcp_bigtable';
import {ColumnOrientedDbms} from '../../../../fractal/component/storage/paas/column_oriented_dbms';

const BASE_CONFIG = {
  id: 'my-bigtable',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My BigTable',
  region: 'us-central1',
};

describe('GcpBigTable', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpBigTable.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.BigTable');
    });

    it('should set provider to GCP', () => {
      const c = GcpBigTable.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should set required region parameter', () => {
      const c = GcpBigTable.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('region')).toBe(
        'us-central1'
      );
    });

    it('should set optional parameters when provided', () => {
      const c = GcpBigTable.create({
        ...BASE_CONFIG,
        instanceType: 'PRODUCTION',
        storageType: 'SSD',
        clusterNodeCount: 3,
        replicationEnabled: true,
      });
      expect(c.parameters.getOptionalFieldByName('instanceType')).toBe(
        'PRODUCTION'
      );
      expect(c.parameters.getOptionalFieldByName('storageType')).toBe('SSD');
      expect(c.parameters.getOptionalFieldByName('clusterNodeCount')).toBe(3);
      expect(
        c.parameters.getOptionalFieldByName('replicationEnabled')
      ).toBe(true);
    });

    it('should not set optional params when omitted', () => {
      const c = GcpBigTable.create(BASE_CONFIG);
      expect(
        c.parameters.getOptionalFieldByName('instanceType')
      ).toBeNull();
      expect(
        c.parameters.getOptionalFieldByName('storageType')
      ).toBeNull();
      expect(
        c.parameters.getOptionalFieldByName('clusterNodeCount')
      ).toBeNull();
      expect(
        c.parameters.getOptionalFieldByName('replicationEnabled')
      ).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const node = ColumnOrientedDbms.create({
        id: 'bp-coldb',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint ColDB',
      });

      const c = GcpBigTable.satisfy(node.dbms)
        .withRegion('europe-west1')
        .build();

      expect(c.id.toString()).toBe('bp-coldb');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint ColDB');
    });

    it('should carry dependencies from blueprint', () => {
      const node = ColumnOrientedDbms.create({
        id: 'bp-coldb',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint ColDB',
      });

      const c = GcpBigTable.satisfy(node.dbms).build();
      expect(c.dependencies).toHaveLength(0);
    });

    it('should carry links from blueprint', () => {
      const node = ColumnOrientedDbms.create({
        id: 'bp-coldb',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint ColDB',
      });

      const c = GcpBigTable.satisfy(node.dbms).build();
      expect(c.links).toHaveLength(0);
    });
  });
});
