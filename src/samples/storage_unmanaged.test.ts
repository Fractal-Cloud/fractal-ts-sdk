/**
 * storage_unmanaged.test.ts
 *
 * M2 migration proof for the Storage "Unmanaged" capability under the
 * Fractal + Interface model. Mirrors
 * samples/network_and_compute_virtual_network_fractal.test.ts and
 * samples/storage_filesandblobs.test.ts:
 *
 *   - An infra team authors ONE Fractal whose Unmanaged abstract component
 *     carries the candidate Offer (SaaSUnmanaged/SaaS).
 *   - An unmanaged resource has no provisioning knobs, so there are no neutral
 *     Interface ops — the dev simply references it. The declared dependencies and
 *     links still flow through to whichever offer the provider selects.
 *   - The Provider chosen at LiveSystem time selects the offer.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offer onto its Service
 *     (SaaS delivery model → one Service).
 *   - An unknown provider throws `No Unmanaged offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {Unmanaged} from '../fractal/component/storage/saas/unmanaged';
import {SaaSUnmanaged} from '../live_system/component/storage/saas/unmanaged';
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
      .withInfrastructureDomain(InfrastructureDomain.Storage)
      .withName(PascalCaseString.getBuilder().withValue('LinkedThing').build())
      .build(),
  )
  .withParameters(getParametersInstance())
  .build();

// ── Infra team: author the Fractal once. ─────────────────────────────────────
function authorUnmanagedFractal() {
  return createFractal({
    id: 'unmanaged',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed reference to an unmanaged storage resource',
    boundedContextId,
    blueprint: bp => ({
      store: bp.add(
        Unmanaged.create({
          id: 'store',
          displayName: 'External Unmanaged Store',
          offers: [SaaSUnmanaged],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    // No neutral Interface ops — an unmanaged resource has no provisioning knobs.
    operations: () => ({}),
  });
}

// ── Dev team: reference through the Fractal, offer-free. ─────────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorUnmanagedFractal();
  return fractal.toLiveSystem({name: 'acme-unmanaged', environment, provider});
}

describe('Unmanaged Fractal — provider-driven offer swap', () => {
  it('selects the SaaS offer type/provider from the authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['SaaS', 'Storage.SaaS.Unmanaged'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const store = ls.components.find(c => c.id.toString() === 'store')!;
      expect(store).toBeDefined();
      expect(store.type.toString()).toBe(expectedType);
      expect(store.provider).toBe(provider);
      // No vendor sub-components for this offer.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows declared deps and links to whichever offer the provider selects', () => {
    const store = specialize('SaaS').components.find(
      c => c.id.toString() === 'store',
    )!;

    // declared dependency + link inherited by the offer
    expect(
      store.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
    ).toBe(true);
    expect(store.links.some(l => l.id.toString() === 'linked-thing')).toBe(
      true,
    );
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('SaaS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('unmanaged');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('SaaS');
  });

  it('serializes the candidate offer onto the Blueprint component Service', () => {
    const blueprint = authorUnmanagedFractal().blueprint;
    const store = blueprint.components.find(c => c.id.toString() === 'store')!;

    expect(store.services).toBeDefined();
    // One SaaS offer → one Service.
    const serviceTypes = store.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Storage.SaaS.Unmanaged']);

    const offerTypes = store
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['Storage.SaaS.Unmanaged']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorUnmanagedFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-unmanaged',
        environment,
        provider: 'AWS',
      }),
    ).toThrow(/No Unmanaged offer/);
  });
});
