import {describe, expect, it} from 'vitest';
import {GcpPostgreSqlDbms} from './gcp_postgresql_dbms';
import {
  RelationalDbms,
  VERSION_PARAM,
} from '../../../../fractal/component/storage/paas/relational_dbms';

const BASE_CONFIG = {
  id: 'my-pg',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My PostgreSQL',
  region: 'us-central1',
};

describe('GcpPostgreSqlDbms', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpPostgreSqlDbms.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.PostgreSqlDbms');
    });

    it('should set provider to GCP', () => {
      const c = GcpPostgreSqlDbms.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should set required region parameter', () => {
      const c = GcpPostgreSqlDbms.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('region')).toBe(
        'us-central1'
      );
    });

    it('should set optional parameters when provided', () => {
      const c = GcpPostgreSqlDbms.create({
        ...BASE_CONFIG,
        dbVersion: '15',
        tier: 'db-custom-2-8192',
        storageAutoResize: true,
      });
      expect(c.parameters.getOptionalFieldByName(VERSION_PARAM)).toBe('15');
      expect(c.parameters.getOptionalFieldByName('tier')).toBe(
        'db-custom-2-8192'
      );
      expect(
        c.parameters.getOptionalFieldByName('storageAutoResize')
      ).toBe(true);
    });

    it('should not set optional params when omitted', () => {
      const c = GcpPostgreSqlDbms.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName(VERSION_PARAM)).toBeNull();
      expect(c.parameters.getOptionalFieldByName('tier')).toBeNull();
      expect(
        c.parameters.getOptionalFieldByName('storageAutoResize')
      ).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const node = RelationalDbms.create({
        id: 'bp-pg',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint PG',
        dbVersion: '14',
      });

      const c = GcpPostgreSqlDbms.satisfy(node.dbms)
        .withRegion('europe-west1')
        .build();

      expect(c.id.toString()).toBe('bp-pg');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint PG');
    });

    it('should carry version param from blueprint', () => {
      const node = RelationalDbms.create({
        id: 'bp-pg',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint PG',
        dbVersion: '14',
      });

      const c = GcpPostgreSqlDbms.satisfy(node.dbms)
        .withRegion('us-east1')
        .build();

      expect(c.parameters.getOptionalFieldByName(VERSION_PARAM)).toBe('14');
    });

    it('should carry dependencies from blueprint', () => {
      const node = RelationalDbms.create({
        id: 'bp-pg',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint PG',
      });

      const c = GcpPostgreSqlDbms.satisfy(node.dbms).build();
      expect(c.dependencies).toHaveLength(0);
    });

    it('should carry links from blueprint', () => {
      const node = RelationalDbms.create({
        id: 'bp-pg',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint PG',
      });

      const c = GcpPostgreSqlDbms.satisfy(node.dbms).build();
      expect(c.links).toHaveLength(0);
    });
  });
});
