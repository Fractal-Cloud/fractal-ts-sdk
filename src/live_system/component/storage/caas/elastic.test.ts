import {describe, expect, it} from 'vitest';
import {Elastic} from './elastic';
import {Search} from '../../../../fractal/component/storage/caas/search';

const BASE_CONFIG = {
  id: 'my-elastic',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Elastic',
};

describe('Elastic', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = Elastic.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.CaaS.Elastic');
    });

    it('should set provider to CaaS', () => {
      const c = Elastic.create(BASE_CONFIG);
      expect(c.provider).toBe('CaaS');
    });

    it('should set vendor-specific parameters', () => {
      const c = Elastic.create({
        ...BASE_CONFIG,
        namespace: 'logging',
        elasticVersion: '8.12.0',
        elasticInstances: 3,
        storage: '50Gi',
      });
      expect(c.parameters.getOptionalFieldByName('namespace')).toBe(
        'logging'
      );
      expect(c.parameters.getOptionalFieldByName('elasticVersion')).toBe(
        '8.12.0'
      );
      expect(c.parameters.getOptionalFieldByName('elasticInstances')).toBe(3);
      expect(c.parameters.getOptionalFieldByName('storage')).toBe('50Gi');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = Search.create({
        id: 'bp-search',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Search',
      });

      const c = Elastic.satisfy(bp.search).build();

      expect(c.id.toString()).toBe('bp-search');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Search');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = Search.create({
        id: 'bp-search',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Search',
      });

      const c = Elastic.satisfy(bp.search).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should allow setting vendor-specific params via satisfied builder', () => {
      const bp = Search.create({
        id: 'bp-search',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Search',
      });

      const c = Elastic.satisfy(bp.search)
        .withNamespace('monitoring')
        .withElasticVersion('8.12.0')
        .withElasticInstances(5)
        .withStorage('100Gi')
        .build();

      expect(c.parameters.getOptionalFieldByName('namespace')).toBe(
        'monitoring'
      );
      expect(c.parameters.getOptionalFieldByName('elasticVersion')).toBe(
        '8.12.0'
      );
      expect(c.parameters.getOptionalFieldByName('elasticInstances')).toBe(5);
      expect(c.parameters.getOptionalFieldByName('storage')).toBe('100Gi');
    });
  });
});
