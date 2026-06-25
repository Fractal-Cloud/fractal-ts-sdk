/**
 * observability_tracing.test.ts
 *
 * M6 migration proof for the Observability "Tracing" capability under the
 * Fractal + Interface model. Mirrors samples/messaging_broker.test.ts:
 *
 *   - An infra team authors ONE Fractal whose Tracing abstract component carries
 *     the candidate Offers (Jaeger/CaaS).
 *   - A dev specializes through the Interface only (set Jaeger's vendor-only
 *     knobs `namespace`, `storage`, `elasticInstances`, `elasticVersion`), never
 *     naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. The neutral
 *     params, declared dependencies and links flow through identically to
 *     whichever offer the provider selects.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No Tracing offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {Tracing} from '../fractal/component/observability/caas/tracing';
import {Jaeger} from '../live_system/component/observability/caas/jaeger';
import {KebabCaseString} from '../values/kebab_case_string';
import {OwnerType} from '../values/owner_type';
import {OwnerId} from '../values/owner_id';
import {getBoundedContextIdBuilder} from '../bounded_context/id';
import {getEnvironmentBuilder} from '../environment/entity';
import {getEnvironmentIdBuilder} from '../environment/id';
import {getComponentIdBuilder} from '../component/id';
import {getLinkBuilder} from '../component/link';
import {getComponentTypeBuilder} from '../component/type';
import {InfrastructureDomain} from '../values/infrastructure_domain';
import {PascalCaseString} from '../values/pascal_case_string';
import {getParametersInstance} from '../values/generic_parameters';
import {LiveSystemComponent} from '../live_system/component';

// ── fixtures ─────────────────────────────────────────────────────────────────

const kebab = (v: string) => KebabCaseString.getBuilder().withValue(v).build();

const ownerId = OwnerId.getBuilder()
  .withValue('00000000-0000-0000-0000-000000000001')
  .build();

const boundedContextId = getBoundedContextIdBuilder()
  .withOwnerType(OwnerType.Personal)
  .withOwnerId(ownerId)
  .withName(kebab('reusable-templates'))
  .build();

const environment = getEnvironmentBuilder()
  .withId(
    getEnvironmentIdBuilder()
      .withOwnerType(OwnerType.Personal)
      .withOwnerId(ownerId)
      .withName(kebab('test'))
      .build(),
  )
  .build();

// A dependency and a link the abstract component declares — both must be
// inherited by whichever offer the provider selects.
const declaredDependencyId = getComponentIdBuilder()
  .withValue(kebab('some-prerequisite'))
  .build();

const declaredLink = getLinkBuilder()
  .withId(getComponentIdBuilder().withValue(kebab('linked-thing')).build())
  .withType(
    getComponentTypeBuilder()
      .withInfrastructureDomain(InfrastructureDomain.Observability)
      .withName(PascalCaseString.getBuilder().withValue('LinkedThing').build())
      .build(),
  )
  .withParameters(getParametersInstance())
  .build();

// ── Infra team: author the Fractal once. ─────────────────────────────────────
function authorTracingFractal() {
  return createFractal({
    id: 'tracing',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed distributed tracing',
    boundedContextId,
    blueprint: bp => ({
      tracing: bp.add(
        Tracing.create({
          id: 'tracing',
          displayName: 'Distributed Tracing',
          offers: [Jaeger],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withNamespace: (namespace: string) =>
        bp.tracing.set('namespace', namespace),
      withStorage: (storage: string) => bp.tracing.set('storage', storage),
      withElasticInstances: (instances: number) =>
        bp.tracing.set('elasticInstances', instances),
      withElasticVersion: (version: string) =>
        bp.tracing.set('elasticVersion', version),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorTracingFractal();
  fractal.operations.withNamespace('observability');
  fractal.operations.withStorage('elasticsearch');
  fractal.operations.withElasticInstances(3);
  fractal.operations.withElasticVersion('8.11.0');
  return fractal.toLiveSystem({name: 'acme-tracing', environment, provider});
}

describe('Tracing Fractal — provider-driven offer swap', () => {
  it('selects the Jaeger CaaS offer from one authored Fractal', () => {
    const ls = specialize('CaaS');
    const tracing = ls.components.find(c => c.id.toString() === 'tracing')!;
    expect(tracing).toBeDefined();
    expect(tracing.type.toString()).toBe('Observability.CaaS.Jaeger');
    expect(tracing.provider).toBe('CaaS');
    // No vendor sub-components for this offer.
    expect(ls.components.length).toBe(1);
  });

  it('flows vendor params, declared deps and links to the offer the provider selects', () => {
    const tracing = specialize('CaaS').components.find(
      c => c.id.toString() === 'tracing',
    )!;

    // params set via the interface flow through to the selected offer
    expect(tracing.parameters.getOptionalFieldByName('namespace')).toBe(
      'observability',
    );
    expect(tracing.parameters.getOptionalFieldByName('storage')).toBe(
      'elasticsearch',
    );
    expect(tracing.parameters.getOptionalFieldByName('elasticInstances')).toBe(
      3,
    );
    expect(tracing.parameters.getOptionalFieldByName('elasticVersion')).toBe(
      '8.11.0',
    );

    // declared dependency + link inherited by the offer
    expect(
      tracing.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
    ).toBe(true);
    expect(tracing.links.some(l => l.id.toString() === 'linked-thing')).toBe(
      true,
    );
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('CaaS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('tracing');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('CaaS');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorTracingFractal().blueprint;
    const tracing = blueprint.components.find(
      c => c.id.toString() === 'tracing',
    )!;

    expect(tracing.services).toBeDefined();
    const serviceTypes = tracing.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Observability.CaaS.Tracing']);

    const offerTypes = tracing
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['Observability.CaaS.Jaeger']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorTracingFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-tracing',
        environment,
        provider: 'AWS',
      }),
    ).toThrow(/No Tracing offer/);
  });
});
