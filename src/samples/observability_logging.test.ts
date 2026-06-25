/**
 * observability_logging.test.ts
 *
 * M6 migration proof for the Observability "Logging" capability under the
 * Fractal + Interface model. Mirrors samples/messaging_broker.test.ts and
 * samples/storage_relationaldatabase.test.ts:
 *
 *   - An infra team authors ONE Fractal whose Logging abstract component carries
 *     the candidate Offer (ObservabilityElastic/CaaS).
 *   - A dev specializes through the Interface only (set the Elastic vendor knobs),
 *     never naming a vendor offer directly.
 *   - The Provider chosen at LiveSystem time selects the offer. The neutral
 *     params, declared dependencies and links flow through identically to the
 *     selected offer.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offer onto its Service.
 *   - An unknown provider throws `No Logging offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {Logging} from '../fractal/component/observability/caas/logging';
import {ObservabilityElastic} from '../live_system/component/observability/caas/elastic';
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
function authorLoggingFractal() {
  return createFractal({
    id: 'logging',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed centralized logging',
    boundedContextId,
    blueprint: bp => ({
      logging: bp.add(
        Logging.create({
          id: 'logging',
          displayName: 'Centralized Logging',
          offers: [ObservabilityElastic],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withNamespace: (namespace: string) =>
        bp.logging.set('namespace', namespace),
      withElasticVersion: (version: string) =>
        bp.logging.set('elasticVersion', version),
      withElasticInstances: (instances: number) =>
        bp.logging.set('elasticInstances', instances),
      withStorage: (storage: string) => bp.logging.set('storage', storage),
      withIsApmRequired: (required: boolean) =>
        bp.logging.set('isApmRequired', required),
      withIsKibanaRequired: (required: boolean) =>
        bp.logging.set('isKibanaRequired', required),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorLoggingFractal();
  fractal.operations.withNamespace('observability');
  fractal.operations.withElasticVersion('8.12.0');
  fractal.operations.withElasticInstances(3);
  fractal.operations.withStorage('100Gi');
  fractal.operations.withIsApmRequired(true);
  fractal.operations.withIsKibanaRequired(true);
  return fractal.toLiveSystem({name: 'acme-logging', environment, provider});
}

describe('Logging Fractal — provider-driven offer selection', () => {
  it('selects the Elastic offer type/provider from the authored Fractal', () => {
    const ls = specialize('CaaS');
    const logging = ls.components.find(c => c.id.toString() === 'logging')!;
    expect(logging).toBeDefined();
    expect(logging.type.toString()).toBe('Observability.CaaS.Elastic');
    expect(logging.provider).toBe('CaaS');
    // No vendor sub-components for the Elastic offer.
    expect(ls.components.length).toBe(1);
  });

  it('flows the neutral params, declared deps and links to the selected offer', () => {
    const logging = specialize('CaaS').components.find(
      c => c.id.toString() === 'logging',
    )!;

    // vendor knobs set via the interface flow through as parameters
    expect(logging.parameters.getOptionalFieldByName('namespace')).toBe(
      'observability',
    );
    expect(logging.parameters.getOptionalFieldByName('elasticVersion')).toBe(
      '8.12.0',
    );
    expect(logging.parameters.getOptionalFieldByName('elasticInstances')).toBe(
      3,
    );
    expect(logging.parameters.getOptionalFieldByName('storage')).toBe('100Gi');
    expect(logging.parameters.getOptionalFieldByName('isApmRequired')).toBe(
      true,
    );
    expect(logging.parameters.getOptionalFieldByName('isKibanaRequired')).toBe(
      true,
    );

    // declared dependency + link inherited by the offer
    expect(
      logging.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
    ).toBe(true);
    expect(logging.links.some(l => l.id.toString() === 'linked-thing')).toBe(
      true,
    );
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('CaaS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('logging');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('CaaS');
  });

  it('serializes the candidate offer onto the Blueprint component Service', () => {
    const blueprint = authorLoggingFractal().blueprint;
    const logging = blueprint.components.find(
      c => c.id.toString() === 'logging',
    )!;

    expect(logging.services).toBeDefined();
    const serviceTypes = logging.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Observability.CaaS.Logging']);

    const offerTypes = logging
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['Observability.CaaS.Elastic']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorLoggingFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-logging',
        environment,
        provider: 'AWS',
      }),
    ).toThrow(/No Logging offer/);
  });
});
