/**
 * storage_columnorienteddbms.test.ts
 *
 * M2 migration proof for the Storage "ColumnOrientedDbms" capability under the
 * Fractal + Interface model. Mirrors samples/network_and_compute_virtual_network_fractal.test.ts
 * and samples/foundations_pattern.test.ts:
 *
 *   - An infra team authors ONE Fractal whose ColumnOrientedDbms abstract
 *     component carries the candidate Offers (AzureCosmosDbCassandra/Azure,
 *     GcpBigTable/GCP).
 *   - A dev specializes through the Interface only, never naming a vendor offer.
 *     ColumnOrientedDbms exposes no vendor-neutral interface ops in v1 (every
 *     candidate offer's knobs are vendor-only), so specialization is provider
 *     selection plus the declared dependencies/links the Fractal author set.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the declared
 *     dependencies and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No ColumnOrientedDbms offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {ColumnOrientedDbms} from '../fractal/component/storage/paas/column_oriented_dbms';
import {AzureCosmosDbCassandra} from '../live_system/component/storage/paas/azure_cosmosdb_cassandra';
import {GcpBigTable} from '../live_system/component/storage/paas/gcp_bigtable';
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
function authorColumnOrientedFractal() {
  return createFractal({
    id: 'wide-column-store',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed column-oriented DBMS',
    boundedContextId,
    blueprint: bp => ({
      dbms: bp.add(
        ColumnOrientedDbms.create({
          id: 'dbms',
          displayName: 'Wide-Column DBMS',
          offers: [AzureCosmosDbCassandra, GcpBigTable],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: () => ({}),
  });
}

// ── Dev team: specialize through provider selection, offer-free. ─────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorColumnOrientedFractal();
  return fractal.toLiveSystem({name: 'acme-wcs', environment, provider});
}

describe('ColumnOrientedDbms Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider for each provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['Azure', 'Storage.PaaS.CosmosDbCassandra'],
      ['GCP', 'Storage.PaaS.BigTable'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const dbms = ls.components.find(c => c.id.toString() === 'dbms')!;
      expect(dbms).toBeDefined();
      expect(dbms.type.toString()).toBe(expectedType);
      expect(dbms.provider).toBe(provider);
      // No vendor sub-components for either offer.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows declared deps and links to whichever offer the provider selects', () => {
    const azureDbms = specialize('Azure').components.find(
      c => c.id.toString() === 'dbms',
    )!;
    const gcpDbms = specialize('GCP').components.find(
      c => c.id.toString() === 'dbms',
    )!;

    for (const dbms of [azureDbms, gcpDbms]) {
      expect(
        dbms.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
      ).toBe(true);
      expect(dbms.links.some(l => l.id.toString() === 'linked-thing')).toBe(
        true,
      );
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('Azure');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('wide-column-store');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Azure');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorColumnOrientedFractal().blueprint;
    const dbms = blueprint.components.find(c => c.id.toString() === 'dbms')!;

    expect(dbms.services).toBeDefined();
    // Both offers share the PaaS delivery model → one Service.
    const serviceTypes = dbms.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Storage.PaaS.ColumnOrientedDbms']);

    const offerTypes = dbms
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'Storage.PaaS.BigTable',
      'Storage.PaaS.CosmosDbCassandra',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorColumnOrientedFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-wcs', environment, provider: 'SaaS'}),
    ).toThrow(/No ColumnOrientedDbms offer/);
  });
});
