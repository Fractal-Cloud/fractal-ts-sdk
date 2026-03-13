import {describe, expect, it} from 'vitest';
import {ObservabilityElastic} from './elastic';
import {Logging} from '../../../../fractal/component/observability/caas/logging';

const BASE_CONFIG = {
  id: 'my-elastic',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Elastic',
};

describe('ObservabilityElastic', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = ObservabilityElastic.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Observability.CaaS.Elastic');
    });

    it('should set provider to CaaS', () => {
      const c = ObservabilityElastic.create(BASE_CONFIG);
      expect(c.provider).toBe('CaaS');
    });

    it('should set vendor-specific parameters', () => {
      const c = ObservabilityElastic.create({
        ...BASE_CONFIG,
        namespace: 'logging',
        elasticVersion: '8.5.0',
        elasticInstances: 3,
        storage: '50Gi',
        isApmRequired: true,
        isKibanaRequired: true,
      });
      expect(c.parameters.getOptionalFieldByName('namespace')).toBe(
        'logging'
      );
      expect(c.parameters.getOptionalFieldByName('elasticVersion')).toBe(
        '8.5.0'
      );
      expect(c.parameters.getOptionalFieldByName('elasticInstances')).toBe(3);
      expect(c.parameters.getOptionalFieldByName('storage')).toBe('50Gi');
      expect(c.parameters.getOptionalFieldByName('isApmRequired')).toBe(true);
      expect(c.parameters.getOptionalFieldByName('isKibanaRequired')).toBe(
        true
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = Logging.create({
        id: 'bp-logging',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Logging',
      });

      const c = ObservabilityElastic.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-logging');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Logging');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = Logging.create({
        id: 'bp-logging',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Logging',
      });

      const c = ObservabilityElastic.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should allow setting vendor-specific params via satisfied builder', () => {
      const bp = Logging.create({
        id: 'bp-logging',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Logging',
      });

      const c = ObservabilityElastic.satisfy(bp.component)
        .withNamespace('prod')
        .withElasticVersion('8.5.0')
        .withElasticInstances(5)
        .withStorage('100Gi')
        .withIsApmRequired(true)
        .withIsKibanaRequired(false)
        .build();

      expect(c.parameters.getOptionalFieldByName('namespace')).toBe('prod');
      expect(c.parameters.getOptionalFieldByName('elasticVersion')).toBe(
        '8.5.0'
      );
      expect(c.parameters.getOptionalFieldByName('elasticInstances')).toBe(5);
      expect(c.parameters.getOptionalFieldByName('storage')).toBe('100Gi');
      expect(c.parameters.getOptionalFieldByName('isApmRequired')).toBe(true);
      expect(c.parameters.getOptionalFieldByName('isKibanaRequired')).toBe(
        false
      );
    });
  });
});
