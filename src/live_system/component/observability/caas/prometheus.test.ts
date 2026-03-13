import {describe, expect, it} from 'vitest';
import {Prometheus} from './prometheus';
import {Monitoring} from '../../../../fractal/component/observability/caas/monitoring';

const BASE_CONFIG = {
  id: 'my-prometheus',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Prometheus',
};

describe('Prometheus', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = Prometheus.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('Observability.CaaS.Prometheus');
    });

    it('should set provider to CaaS', () => {
      const c = Prometheus.create(BASE_CONFIG);
      expect(c.provider).toBe('CaaS');
    });

    it('should set vendor-specific parameters', () => {
      const c = Prometheus.create({
        ...BASE_CONFIG,
        namespace: 'monitoring',
        apiGatewayUrl: 'https://gateway.example.com',
      });
      expect(c.parameters.getOptionalFieldByName('namespace')).toBe(
        'monitoring'
      );
      expect(c.parameters.getOptionalFieldByName('apiGatewayUrl')).toBe(
        'https://gateway.example.com'
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = Monitoring.create({
        id: 'bp-monitoring',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Monitoring',
      });

      const c = Prometheus.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-monitoring');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Monitoring');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = Monitoring.create({
        id: 'bp-monitoring',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Monitoring',
      });

      const c = Prometheus.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should allow setting vendor-specific params via satisfied builder', () => {
      const bp = Monitoring.create({
        id: 'bp-monitoring',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Monitoring',
      });

      const c = Prometheus.satisfy(bp.component)
        .withNamespace('prod')
        .withApiGatewayUrl('https://prod-gateway.example.com')
        .build();

      expect(c.parameters.getOptionalFieldByName('namespace')).toBe('prod');
      expect(c.parameters.getOptionalFieldByName('apiGatewayUrl')).toBe(
        'https://prod-gateway.example.com'
      );
    });
  });
});
