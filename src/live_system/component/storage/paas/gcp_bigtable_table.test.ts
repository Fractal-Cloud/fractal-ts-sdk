import {describe, expect, it} from 'vitest';
import {GcpBigTableTable} from './gcp_bigtable_table';
import {ColumnOrientedEntity} from '../../../../fractal/component/storage/paas/column_oriented_entity';

const BASE_CONFIG = {
  id: 'my-table',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Table',
};

describe('GcpBigTableTable', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpBigTableTable.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.BigTableTable');
    });

    it('should set provider to GCP', () => {
      const c = GcpBigTableTable.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should set optional parameters when provided', () => {
      const c = GcpBigTableTable.create({
        ...BASE_CONFIG,
        tableId: 'events',
        columnFamilies: ['cf1', 'cf2'],
        splitKeys: ['row-a', 'row-b'],
      });
      expect(c.parameters.getOptionalFieldByName('tableId')).toBe('events');
      expect(c.parameters.getOptionalFieldByName('columnFamilies')).toEqual([
        'cf1',
        'cf2',
      ]);
      expect(c.parameters.getOptionalFieldByName('splitKeys')).toEqual([
        'row-a',
        'row-b',
      ]);
    });

    it('should not set optional params when omitted', () => {
      const c = GcpBigTableTable.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('tableId')).toBeNull();
      expect(
        c.parameters.getOptionalFieldByName('columnFamilies')
      ).toBeNull();
      expect(c.parameters.getOptionalFieldByName('splitKeys')).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {component: blueprint} = ColumnOrientedEntity.create({
        id: 'bp-table',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Table',
      });

      const c = GcpBigTableTable.satisfy(blueprint)
        .withTableId('events')
        .build();

      expect(c.id.toString()).toBe('bp-table');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Table');
    });

    it('should carry dependencies from blueprint', () => {
      const {component: blueprint} = ColumnOrientedEntity.create({
        id: 'bp-table',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Table',
      });

      const c = GcpBigTableTable.satisfy(blueprint).build();
      expect(c.dependencies).toHaveLength(0);
    });

    it('should carry links from blueprint', () => {
      const {component: blueprint} = ColumnOrientedEntity.create({
        id: 'bp-table',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Table',
      });

      const c = GcpBigTableTable.satisfy(blueprint).build();
      expect(c.links).toHaveLength(0);
    });
  });
});
