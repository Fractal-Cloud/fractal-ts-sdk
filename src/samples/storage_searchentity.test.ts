/**
 * storage_searchentity.test.ts
 *
 * M2 migration proof for the Storage "SearchEntity" capability under the
 * Fractal + Interface model. Mirrors samples/storage_filesandblobs.test.ts and
 * samples/network_and_compute_virtual_network_fractal.test.ts:
 *
 *   - An infra team authors ONE Fractal whose SearchEntity abstract component
 *     carries the candidate Offers (IndexPattern/CaaS).
 *   - A dev specializes through the Interface only; SearchEntity has a single
 *     CaaS offer today, so it carries no neutral params — the offer-only knobs
 *     (namespace, pattern, timeField, isDefault) live on the IndexPattern offer.
 *   - The Provider chosen at LiveSystem time selects the offer. The CaaS provider
 *     resolves to IndexPattern; the neutral params, declared dependency (on the
 *     Search backend) and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offer onto its Service.
 *   - An unknown provider throws `No SearchEntity offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {SearchEntity} from '../fractal/component/storage/caas/search_entity';
import {IndexPattern} from '../live_system/component/storage/caas/index_pattern';
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

// A SearchEntity depends on its Search backend. The declared dependency and a
// link must be inherited by whichever offer the provider selects.
const searchDependencyId = getComponentIdBuilder()
  .withValue(kebab('search'))
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
function authorSearchEntityFractal() {
  return createFractal({
    id: 'search-entity',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed search entity',
    boundedContextId,
    blueprint: bp => ({
      entity: bp.add(
        SearchEntity.create({
          id: 'entity',
          displayName: 'App Search Entity',
          offers: [IndexPattern],
          dependencies: [{id: searchDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: () => ({}),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorSearchEntityFractal();
  return fractal.toLiveSystem({name: 'acme-search', environment, provider});
}

describe('SearchEntity Fractal — provider-driven offer swap', () => {
  it('selects the IndexPattern offer for the CaaS provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['CaaS', 'Storage.CaaS.IndexPattern'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const entity = ls.components.find(c => c.id.toString() === 'entity')!;
      expect(entity).toBeDefined();
      expect(entity.type.toString()).toBe(expectedType);
      expect(entity.provider).toBe(provider);
      // No vendor sub-components for this offer.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows the declared dependency on Search and the declared link to the selected offer', () => {
    const entity = specialize('CaaS').components.find(
      c => c.id.toString() === 'entity',
    )!;

    expect(entity.dependencies.some(d => d.id.toString() === 'search')).toBe(
      true,
    );
    expect(entity.links.some(l => l.id.toString() === 'linked-thing')).toBe(
      true,
    );
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('CaaS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('search-entity');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('CaaS');
  });

  it('serializes the candidate offer onto the Blueprint component Service', () => {
    const blueprint = authorSearchEntityFractal().blueprint;
    const entity = blueprint.components.find(
      c => c.id.toString() === 'entity',
    )!;

    expect(entity.services).toBeDefined();
    // Single CaaS offer → one Service.
    const serviceTypes = entity.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Storage.CaaS.SearchEntity']);

    const offerTypes = entity
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['Storage.CaaS.IndexPattern']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorSearchEntityFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-search', environment, provider: 'AWS'}),
    ).toThrow(/No SearchEntity offer/);
  });
});
