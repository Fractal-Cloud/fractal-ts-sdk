/**
 * basic_observability.test.ts
 *
 * Integration tests for the basic_observability sample pattern.
 * Verifies the blueprint builds correctly and the CaaS live system
 * maps components with the right types and parameters.
 */

import {describe, expect, it} from 'vitest';
import {Monitoring} from '../fractal/component/observability/caas/monitoring';
import {Tracing} from '../fractal/component/observability/caas/tracing';
import {Logging} from '../fractal/component/observability/caas/logging';
import {Prometheus} from '../live_system/component/observability/caas/prometheus';
import {Jaeger} from '../live_system/component/observability/caas/jaeger';
import {ObservabilityElastic} from '../live_system/component/observability/caas/elastic';

// ── Blueprint fixtures ──────────────────────────────────────────────────────

const monitoring = Monitoring.create({
  id: 'monitoring',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'Monitoring',
});

const tracing = Tracing.create({
  id: 'tracing',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'Tracing',
});

const logging = Logging.create({
  id: 'logging',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'Logging',
});

// ── Blueprint tests ─────────────────────────────────────────────────────────

describe('basic_observability blueprint', () => {
  it('should create Monitoring with correct type', () => {
    expect(monitoring.component.type.toString()).toBe(
      'Observability.CaaS.Monitoring',
    );
    expect(monitoring.component.id.toString()).toBe('monitoring');
    expect(monitoring.component.displayName).toBe('Monitoring');
  });

  it('should create Tracing with correct type', () => {
    expect(tracing.component.type.toString()).toBe(
      'Observability.CaaS.Tracing',
    );
    expect(tracing.component.id.toString()).toBe('tracing');
    expect(tracing.component.displayName).toBe('Tracing');
  });

  it('should create Logging with correct type', () => {
    expect(logging.component.type.toString()).toBe(
      'Observability.CaaS.Logging',
    );
    expect(logging.component.id.toString()).toBe('logging');
    expect(logging.component.displayName).toBe('Logging');
  });

  it('should include exactly one component per node', () => {
    expect(monitoring.components).toHaveLength(1);
    expect(tracing.components).toHaveLength(1);
    expect(logging.components).toHaveLength(1);
  });

  it('should have three blueprint components total', () => {
    const all = [
      ...monitoring.components,
      ...tracing.components,
      ...logging.components,
    ];
    expect(all).toHaveLength(3);
  });
});

// ── CaaS live system tests ──────────────────────────────────────────────────

describe('basic_observability CaaS live system', () => {
  it('should satisfy Monitoring with Prometheus', () => {
    const prometheus = Prometheus.satisfy(monitoring.component)
      .withNamespace('monitoring')
      .withApiGatewayUrl('http://gateway:8080')
      .build();

    expect(prometheus.type.toString()).toBe('Observability.CaaS.Prometheus');
    expect(prometheus.provider).toBe('CaaS');
    expect(prometheus.id.toString()).toBe('monitoring');
    expect(prometheus.displayName).toBe('Monitoring');
    expect(prometheus.parameters.getOptionalFieldByName('namespace')).toBe(
      'monitoring',
    );
    expect(
      prometheus.parameters.getOptionalFieldByName('apiGatewayUrl'),
    ).toBe('http://gateway:8080');
  });

  it('should satisfy Tracing with Jaeger', () => {
    const jaeger = Jaeger.satisfy(tracing.component)
      .withNamespace('tracing')
      .withStorage('elasticsearch')
      .build();

    expect(jaeger.type.toString()).toBe('Observability.CaaS.Jaeger');
    expect(jaeger.provider).toBe('CaaS');
    expect(jaeger.id.toString()).toBe('tracing');
    expect(jaeger.displayName).toBe('Tracing');
    expect(jaeger.parameters.getOptionalFieldByName('namespace')).toBe(
      'tracing',
    );
    expect(jaeger.parameters.getOptionalFieldByName('storage')).toBe(
      'elasticsearch',
    );
  });

  it('should satisfy Logging with ObservabilityElastic', () => {
    const elastic = ObservabilityElastic.satisfy(logging.component)
      .withNamespace('logging')
      .withElasticVersion('8.12.0')
      .withElasticInstances(3)
      .withStorage('50Gi')
      .withIsKibanaRequired(true)
      .build();

    expect(elastic.type.toString()).toBe('Observability.CaaS.Elastic');
    expect(elastic.provider).toBe('CaaS');
    expect(elastic.id.toString()).toBe('logging');
    expect(elastic.displayName).toBe('Logging');
    expect(elastic.parameters.getOptionalFieldByName('namespace')).toBe(
      'logging',
    );
    expect(elastic.parameters.getOptionalFieldByName('elasticVersion')).toBe(
      '8.12.0',
    );
    expect(
      elastic.parameters.getOptionalFieldByName('elasticInstances'),
    ).toBe(3);
    expect(elastic.parameters.getOptionalFieldByName('storage')).toBe('50Gi');
    expect(
      elastic.parameters.getOptionalFieldByName('isKibanaRequired'),
    ).toBe(true);
  });
});
