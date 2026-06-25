/**
 * observability_unmanaged.test.ts
 *
 * M6 migration proof for the Observability "Unmanaged" capability under the
 * Fractal + Interface model. Mirrors samples/apimanagement_unmanaged.test.ts and
 * samples/messaging_broker.test.ts:
 *
 *   - An infra team authors ONE Fractal whose ObservabilityUnmanaged abstract
 *     component carries the candidate Offers (ObservabilityUnmanaged/SaaS).
 *   - A dev consumes through the Interface only; this capability has no
 *     vendor-neutral knobs, so the Interface declares no neutral ops.
 *   - The Provider chosen at LiveSystem time selects the offer. Choosing SaaS
 *     resolves the offer; choosing any other provider throws — proving offer
 *     selection is provider-driven while declared dependencies and links flow
 *     through identically to whichever offer is selected.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No Unmanaged offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {ObservabilityUnmanaged} from '../fractal/component/observability/saas/unmanaged';
import {ObservabilityUnmanaged as ObservabilitySaaSUnmanagedOffer} from '../live_system/component/observability/saas/unmanaged';
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
function authorUnmanagedFractal() {
  return createFractal({
    id: 'observability',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed unmanaged observability stack',
    boundedContextId,
    blueprint: bp => ({
      observability: bp.add(
        ObservabilityUnmanaged.create({
          id: 'observability',
          displayName: 'Observability',
          offers: [ObservabilitySaaSUnmanagedOffer],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    // ObservabilityUnmanaged has no vendor-neutral knobs — the Interface
    // exposes no neutral ops.
    operations: () => ({}),
  });
}

// ── Dev team: select a provider; no neutral specialization needed. ───────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorUnmanagedFractal();
  return fractal.toLiveSystem({
    name: 'acme-observability',
    environment,
    provider,
  });
}

describe('ObservabilityUnmanaged Fractal — provider-driven offer swap', () => {
  it('selects the SaaS offer type/provider from one authored Fractal', () => {
    const ls = specialize('SaaS');
    const observability = ls.components.find(
      c => c.id.toString() === 'observability',
    )!;
    expect(observability).toBeDefined();
    expect(observability.type.toString()).toBe('Observability.SaaS.Unmanaged');
    expect(observability.provider).toBe('SaaS');
    // No vendor sub-components for this offer.
    expect(ls.components.length).toBe(1);
  });

  it('flows declared deps and links to whichever offer the provider selects', () => {
    const observability = specialize('SaaS').components.find(
      c => c.id.toString() === 'observability',
    )!;

    expect(
      observability.dependencies.some(
        d => d.id.toString() === 'some-prerequisite',
      ),
    ).toBe(true);
    expect(
      observability.links.some(l => l.id.toString() === 'linked-thing'),
    ).toBe(true);
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('SaaS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('observability');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('SaaS');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorUnmanagedFractal().blueprint;
    const observability = blueprint.components.find(
      c => c.id.toString() === 'observability',
    )!;

    expect(observability.services).toBeDefined();
    const serviceTypes = observability
      .services!.map(s => s.type.toString())
      .sort();
    expect(serviceTypes).toEqual(['Observability.SaaS.Unmanaged']);

    const offerTypes = observability
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['Observability.SaaS.Unmanaged']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorUnmanagedFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-observability',
        environment,
        provider: 'Azure',
      }),
    ).toThrow(/No Unmanaged offer/);
  });
});
