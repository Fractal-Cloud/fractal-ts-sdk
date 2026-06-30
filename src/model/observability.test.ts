/**
 * observability.test.ts — executable spec for the Observability domain.
 *
 * Proves the Observability Component factories + CaaS offers ride the LOCKED
 * Fractal engine: guardrails lock, dev-open params flow, and per-component offer
 * selection resolves to vendor-neutral CaaS live components (no provider).
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {Monitoring, Tracing, Logging} from './components/observability';
import {Prometheus, Jaeger, ObservabilityElastic} from './offers/observability';

const environment = {};
const boundedContextId = {id: 'reusable-templates'};

function authorFractal() {
  return createFractal({
    id: 'observability-stack',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const monitoring = bp.add(
        Monitoring({id: 'monitoring'}).withRetentionDays(30),
      );
      const tracing = bp.add(
        Tracing({id: 'tracing'}).withRetentionDays(7).withSamplingRate(0.1),
      );
      const logging = bp.add(Logging({id: 'logging'}).withRetentionDays(14));
      return {monitoring, tracing, logging};
    },
    operations: s => ({
      // scrapeInterval is NOT pre-locked, so it is dev-open here.
      withScrape: (n: number) => s.monitoring.set('scrapeInterval', n),
    }),
  });
}

const fullSelect = () => ({
  monitoring: Prometheus({}),
  tracing: Jaeger({}),
  logging: ObservabilityElastic({}),
});

describe('Observability domain', () => {
  it('blueprint exposes abstract Observability Components', () => {
    const bp = authorFractal().blueprint;
    expect(bp.components.map(c => c.component)).toEqual([
      'Observability.Monitoring',
      'Observability.Tracing',
      'Observability.Logging',
    ]);
  });

  it('guardrails are recorded and locked', () => {
    const mon = authorFractal().blueprint.components.find(
      c => c.id === 'monitoring',
    )!;
    expect(mon.parameters.retentionDays).toBe(30);
    expect(mon.locked).toContain('retentionDays');
    const trace = authorFractal().blueprint.components.find(
      c => c.id === 'tracing',
    )!;
    expect(trace.parameters.samplingRate).toBe(0.1);
    expect(trace.locked).toContain('samplingRate');
  });

  it('builds a vendor-neutral CaaS LiveSystem; dev-open param flows', () => {
    const ls = authorFractal()
      .specialize()
      .withScrape(15)
      .toLiveSystem({name: 'acme-obs', environment, select: fullSelect()});

    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));
    // offer types resolved
    expect(byId['monitoring'].type).toBe('Observability.CaaS.Prometheus');
    expect(byId['tracing'].type).toBe('Observability.CaaS.Jaeger');
    expect(byId['logging'].type).toBe('Observability.CaaS.Elastic');
    // vendor-neutral — no provider on any CaaS offer
    expect(byId['monitoring'].provider).toBeUndefined();
    expect(byId['monitoring'].deliveryModel).toBe('CaaS');
    // guardrail flowed
    expect(byId['monitoring'].parameters.retentionDays).toBe(30);
    // dev-open param flowed
    expect(byId['monitoring'].parameters.scrapeInterval).toBe(15);
  });

  it('selecting a wrong offer for a Component is a type error AND throws', () => {
    expect(() =>
      authorFractal().toLiveSystem({
        name: 'x',
        environment,
        select: {
          ...fullSelect(),
          // @ts-expect-error Jaeger (Observability.Tracing) cannot satisfy Observability.Monitoring
          monitoring: Jaeger({}),
        },
      }),
    ).toThrow(/does not satisfy/);
  });
});
