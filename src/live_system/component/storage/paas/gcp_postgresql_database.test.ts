import {describe, expect, it} from 'vitest';
import {GcpPostgreSqlDatabase} from './gcp_postgresql_database';
import {RelationalDatabase} from '../../../../fractal/component/storage/paas/relational_database';

const BASE_CONFIG = {
  id: 'my-db',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Database',
};

describe('GcpPostgreSqlDatabase', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpPostgreSqlDatabase.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.PaaS.PostgreSqlDatabase');
    });

    it('should set provider to GCP', () => {
      const c = GcpPostgreSqlDatabase.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should set optional parameters when provided', () => {
      const c = GcpPostgreSqlDatabase.create({
        ...BASE_CONFIG,
        collation: 'en_US.UTF-8',
        charset: 'UTF8',
      });
      expect(c.parameters.getOptionalFieldByName('collation')).toBe(
        'en_US.UTF-8'
      );
      expect(c.parameters.getOptionalFieldByName('charset')).toBe('UTF8');
    });

    it('should not set optional params when omitted', () => {
      const c = GcpPostgreSqlDatabase.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('collation')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('charset')).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {component: blueprint} = RelationalDatabase.create({
        id: 'bp-db',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint DB',
      });

      const c = GcpPostgreSqlDatabase.satisfy(blueprint).build();

      expect(c.id.toString()).toBe('bp-db');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint DB');
    });

    it('should carry dependencies from blueprint', () => {
      const {component: blueprint} = RelationalDatabase.create({
        id: 'bp-db',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint DB',
      });

      const c = GcpPostgreSqlDatabase.satisfy(blueprint).build();
      expect(c.dependencies).toHaveLength(0);
    });

    it('should carry links from blueprint', () => {
      const {component: blueprint} = RelationalDatabase.create({
        id: 'bp-db',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint DB',
      });

      const c = GcpPostgreSqlDatabase.satisfy(blueprint).build();
      expect(c.links).toHaveLength(0);
    });
  });
});
