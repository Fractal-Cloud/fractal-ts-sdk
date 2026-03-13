import {describe, expect, it} from 'vitest';
import {IndexPattern} from './index_pattern';
import {SearchEntity} from '../../../../fractal/component/storage/caas/search_entity';

const BASE_CONFIG = {
  id: 'my-pattern',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Index Pattern',
};

describe('IndexPattern', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = IndexPattern.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Storage.CaaS.IndexPattern');
    });

    it('should set provider to CaaS', () => {
      const c = IndexPattern.create(BASE_CONFIG);
      expect(c.provider).toBe('CaaS');
    });

    it('should set vendor-specific parameters', () => {
      const c = IndexPattern.create({
        ...BASE_CONFIG,
        namespace: 'logging',
        pattern: 'logs-*',
        timeField: '@timestamp',
        isDefault: true,
      });
      expect(c.parameters.getOptionalFieldByName('namespace')).toBe(
        'logging'
      );
      expect(c.parameters.getOptionalFieldByName('pattern')).toBe('logs-*');
      expect(c.parameters.getOptionalFieldByName('timeField')).toBe(
        '@timestamp'
      );
      expect(c.parameters.getOptionalFieldByName('isDefault')).toBe(true);
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = SearchEntity.create({
        id: 'bp-entity',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Entity',
      });

      const c = IndexPattern.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-entity');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Entity');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = SearchEntity.create({
        id: 'bp-entity',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Entity',
      });

      const c = IndexPattern.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should allow setting vendor-specific params via satisfied builder', () => {
      const bp = SearchEntity.create({
        id: 'bp-entity',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Entity',
      });

      const c = IndexPattern.satisfy(bp.component)
        .withNamespace('monitoring')
        .withPattern('metrics-*')
        .withTimeField('timestamp')
        .withIsDefault(false)
        .build();

      expect(c.parameters.getOptionalFieldByName('namespace')).toBe(
        'monitoring'
      );
      expect(c.parameters.getOptionalFieldByName('pattern')).toBe(
        'metrics-*'
      );
      expect(c.parameters.getOptionalFieldByName('timeField')).toBe(
        'timestamp'
      );
      expect(c.parameters.getOptionalFieldByName('isDefault')).toBe(false);
    });
  });
});
