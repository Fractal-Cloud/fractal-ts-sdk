/**
 * storage_search.test.ts
 *
 * M2 migration proof for the Storage "Search" capability under the Fractal +
 * Interface model. Mirrors
 * samples/network_and_compute_virtual_network_fractal.test.ts:
 *
 *   - An infra team authors ONE Fractal whose Search abstract component carries
 *     the candidate Offers (Elastic/CaaS, OpenshiftPersistentVolume/RedHat).
 *   - A dev specializes through the Interface only (set `namespace`), never
 *     naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the neutral params,
 *     declared dependencies and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Services (both
 *     offers are CaaS delivery model → one Service).
 *   - An unknown provider throws `No Search offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {Search} from '../fractal/component/storage/caas/search';
import {Elastic} from '../live_system/component/storage/caas/elastic';
import {OpenshiftPersistentVolume} from '../live_system/component/storage/caas/openshift_persistent_volume';
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
function authorSearchFractal() {
  return createFractal({
    id: 'storage-search',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed search engine',
    boundedContextId,
    blueprint: bp => ({
      search: bp.add(
        Search.create({
          id: 'search',
          displayName: 'App Search',
          offers: [Elastic, OpenshiftPersistentVolume],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withNamespace: (namespace: string) =>
        bp.search.set('namespace', namespace),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorSearchFractal();
  fractal.operations.withNamespace('search-ns');
  return fractal.toLiveSystem({name: 'acme-search', environment, provider});
}

describe('Search Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider for each provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['CaaS', 'Storage.CaaS.Elastic'],
      ['RedHat', 'Storage.CaaS.OpenshiftPersistentVolume'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const search = ls.components.find(c => c.id.toString() === 'search')!;
      expect(search).toBeDefined();
      expect(search.type.toString()).toBe(expectedType);
      expect(search.provider).toBe(provider);
      // No vendor sub-components for either offer.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows identical neutral params, declared deps and links to whichever offer the provider selects', () => {
    const caasSearch = specialize('CaaS').components.find(
      c => c.id.toString() === 'search',
    )!;
    const redhatSearch = specialize('RedHat').components.find(
      c => c.id.toString() === 'search',
    )!;

    // neutral params set via the interface — identical across providers
    expect(caasSearch.parameters.getOptionalFieldByName('namespace')).toBe(
      'search-ns',
    );
    expect(caasSearch.parameters.getOptionalFieldByName('namespace')).toEqual(
      redhatSearch.parameters.getOptionalFieldByName('namespace'),
    );

    // declared dependency + link inherited by every offer
    for (const search of [caasSearch, redhatSearch]) {
      expect(
        search.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
      ).toBe(true);
      expect(search.links.some(l => l.id.toString() === 'linked-thing')).toBe(
        true,
      );
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('CaaS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('storage-search');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('CaaS');
  });

  it('serializes candidate offers onto the Blueprint component Services', () => {
    const blueprint = authorSearchFractal().blueprint;
    const search = blueprint.components.find(
      c => c.id.toString() === 'search',
    )!;

    expect(search.services).toBeDefined();
    // Both offers are CaaS delivery model → one Service.
    const serviceTypes = search.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Storage.CaaS.Search']);

    const offerTypes = search
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'Storage.CaaS.Elastic',
      'Storage.CaaS.OpenshiftPersistentVolume',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorSearchFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-search', environment, provider: 'OCI'}),
    ).toThrow(/No Search offer/);
  });
});
