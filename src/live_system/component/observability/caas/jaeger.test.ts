import {describe, expect, it} from 'vitest';
import {Jaeger} from './jaeger';
import {Tracing} from '../../../../fractal/component/observability/caas/tracing';

const BASE_CONFIG = {
  id: 'my-jaeger',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Jaeger',
};

describe('Jaeger', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = Jaeger.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Observability.CaaS.Jaeger');
    });

    it('should set provider to CaaS', () => {
      const c = Jaeger.create(BASE_CONFIG);
      expect(c.provider).toBe('CaaS');
    });

    it('should set vendor-specific parameters', () => {
      const c = Jaeger.create({
        ...BASE_CONFIG,
        namespace: 'tracing',
        storage: 'elasticsearch',
        elasticInstances: 3,
        elasticVersion: '7.17.0',
      });
      expect(c.parameters.getOptionalFieldByName('namespace')).toBe(
        'tracing'
      );
      expect(c.parameters.getOptionalFieldByName('storage')).toBe(
        'elasticsearch'
      );
      expect(c.parameters.getOptionalFieldByName('elasticInstances')).toBe(3);
      expect(c.parameters.getOptionalFieldByName('elasticVersion')).toBe(
        '7.17.0'
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = Tracing.create({
        id: 'bp-tracing',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Tracing',
      });

      const c = Jaeger.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-tracing');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Tracing');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = Tracing.create({
        id: 'bp-tracing',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Tracing',
      });

      const c = Jaeger.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should allow setting vendor-specific params via satisfied builder', () => {
      const bp = Tracing.create({
        id: 'bp-tracing',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Tracing',
      });

      const c = Jaeger.satisfy(bp.component)
        .withNamespace('prod')
        .withStorage('elasticsearch')
        .withElasticInstances(5)
        .withElasticVersion('8.0.0')
        .build();

      expect(c.parameters.getOptionalFieldByName('namespace')).toBe('prod');
      expect(c.parameters.getOptionalFieldByName('storage')).toBe(
        'elasticsearch'
      );
      expect(c.parameters.getOptionalFieldByName('elasticInstances')).toBe(5);
      expect(c.parameters.getOptionalFieldByName('elasticVersion')).toBe(
        '8.0.0'
      );
    });
  });
});
