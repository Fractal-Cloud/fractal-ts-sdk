/**
 * observability_monitoring.test.ts
 *
 * M6 migration proof for the Observability "Monitoring" capability under the
 * Fractal + Interface model. Mirrors samples/messaging_broker.test.ts:
 *
 *   - An infra team authors ONE Fractal whose Monitoring abstract component
 *     carries the candidate Offers (Prometheus/CaaS).
 *   - A dev specializes through the Interface only, never naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Prometheus is a
 *     CaaS offer, so the CaaS provider selects it; the declared dependencies and
 *     links flow through identically to whichever offer the provider selects.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No Monitoring offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {Monitoring} from '../fractal/component/observability/caas/monitoring';
import {Prometheus} from '../live_system/component/observability/caas/prometheus';
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
function authorMonitoringFractal() {
  return createFractal({
    id: 'monitoring',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed monitoring stack',
    boundedContextId,
    blueprint: bp => ({
      monitoring: bp.add(
        Monitoring.create({
          id: 'monitoring',
          displayName: 'Metrics & Monitoring',
          offers: [Prometheus],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: () => ({}),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorMonitoringFractal();
  return fractal.toLiveSystem({name: 'acme-monitoring', environment, provider});
}

describe('Monitoring Fractal — provider-driven offer swap', () => {
  it('selects the CaaS Prometheus offer from one authored Fractal', () => {
    const ls = specialize('CaaS');
    const monitoring = ls.components.find(
      c => c.id.toString() === 'monitoring',
    )!;
    expect(monitoring).toBeDefined();
    expect(monitoring.type.toString()).toBe('Observability.CaaS.Prometheus');
    expect(monitoring.provider).toBe('CaaS');
    // No vendor sub-components for the Prometheus offer.
    expect(ls.components.length).toBe(1);
  });

  it('flows declared deps and links to whichever offer the provider selects', () => {
    const monitoring = specialize('CaaS').components.find(
      c => c.id.toString() === 'monitoring',
    )!;

    expect(
      monitoring.dependencies.some(
        d => d.id.toString() === 'some-prerequisite',
      ),
    ).toBe(true);
    expect(monitoring.links.some(l => l.id.toString() === 'linked-thing')).toBe(
      true,
    );
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('CaaS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('monitoring');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('CaaS');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorMonitoringFractal().blueprint;
    const monitoring = blueprint.components.find(
      c => c.id.toString() === 'monitoring',
    )!;

    expect(monitoring.services).toBeDefined();
    const serviceTypes = monitoring
      .services!.map(s => s.type.toString())
      .sort();
    expect(serviceTypes).toEqual(['Observability.CaaS.Monitoring']);

    const offerTypes = monitoring
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['Observability.CaaS.Prometheus']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorMonitoringFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-monitoring',
        environment,
        provider: 'Azure',
      }),
    ).toThrow(/No Monitoring offer/);
  });
});
