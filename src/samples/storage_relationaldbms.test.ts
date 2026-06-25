/**
 * storage_relationaldbms.test.ts
 *
 * M2 migration proof for the Storage "RelationalDbms" capability under the
 * Fractal + Interface model. Mirrors samples/network_and_compute_virtual_network_fractal.test.ts
 * and samples/storage_columnorienteddbms.test.ts:
 *
 *   - An infra team authors ONE Fractal whose RelationalDbms abstract component
 *     carries the candidate Offers (ArubaMsSqlDbms/Aruba, ArubaMySqlDbms/Aruba,
 *     AzurePostgreSqlDbms/Azure, GcpPostgreSqlDbms/GCP).
 *   - A dev specializes through the Interface only — setting the vendor-neutral
 *     `version` and `flavorName` — never naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the neutral params,
 *     declared dependencies and links flow through identically. When two offers
 *     share a provider (the two Aruba offers), the first candidate wins.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No RelationalDbms offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {RelationalDbms} from '../fractal/component/storage/paas/relational_dbms';
import {ArubaMsSqlDbms} from '../live_system/component/storage/paas/aruba_mssql_dbms';
import {ArubaMySqlDbms} from '../live_system/component/storage/paas/aruba_mysql_dbms';
import {AzurePostgreSqlDbms} from '../live_system/component/storage/paas/azure_postgresql_dbms';
import {GcpPostgreSqlDbms} from '../live_system/component/storage/paas/gcp_postgresql_dbms';
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
function authorRelationalDbmsFractal() {
  return createFractal({
    id: 'relational-store',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed relational DBMS',
    boundedContextId,
    blueprint: bp => ({
      dbms: bp.add(
        RelationalDbms.create({
          id: 'dbms',
          displayName: 'Relational DBMS',
          offers: [
            ArubaMsSqlDbms,
            ArubaMySqlDbms,
            AzurePostgreSqlDbms,
            GcpPostgreSqlDbms,
          ],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withVersion: (version: string) => bp.dbms.set('version', version),
      withFlavorName: (flavorName: string) =>
        bp.dbms.set('flavorName', flavorName),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorRelationalDbmsFractal();
  fractal.operations.withVersion('15');
  fractal.operations.withFlavorName('GeneralPurpose');
  return fractal.toLiveSystem({name: 'acme-rdbms', environment, provider});
}

describe('RelationalDbms Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider for each provider from one authored Fractal', () => {
    // Aruba has two candidate offers; the first (ArubaMsSqlDbms) wins.
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['Aruba', 'Storage.PaaS.ArubaMsSqlDbms'],
      ['Azure', 'Storage.PaaS.PostgreSqlDbms'],
      ['GCP', 'Storage.PaaS.PostgreSqlDbms'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const dbms = ls.components.find(c => c.id.toString() === 'dbms')!;
      expect(dbms).toBeDefined();
      expect(dbms.type.toString()).toBe(expectedType);
      expect(dbms.provider).toBe(provider);
      // No vendor sub-components for any of these offers.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows identical neutral params, declared deps and links to whichever offer the provider selects', () => {
    const arubaDbms = specialize('Aruba').components.find(
      c => c.id.toString() === 'dbms',
    )!;
    const azureDbms = specialize('Azure').components.find(
      c => c.id.toString() === 'dbms',
    )!;
    const gcpDbms = specialize('GCP').components.find(
      c => c.id.toString() === 'dbms',
    )!;

    // neutral params set via the interface — identical across providers
    expect(arubaDbms.parameters.getOptionalFieldByName('version')).toBe('15');
    expect(arubaDbms.parameters.getOptionalFieldByName('flavorName')).toBe(
      'GeneralPurpose',
    );
    expect(arubaDbms.parameters.getOptionalFieldByName('version')).toEqual(
      azureDbms.parameters.getOptionalFieldByName('version'),
    );
    expect(azureDbms.parameters.getOptionalFieldByName('version')).toEqual(
      gcpDbms.parameters.getOptionalFieldByName('version'),
    );
    expect(arubaDbms.parameters.getOptionalFieldByName('flavorName')).toEqual(
      gcpDbms.parameters.getOptionalFieldByName('flavorName'),
    );

    // declared dependency + link inherited by every offer
    for (const dbms of [arubaDbms, azureDbms, gcpDbms]) {
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
    expect(ls.fractalId.toString()).toContain('relational-store');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Azure');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorRelationalDbmsFractal().blueprint;
    const dbms = blueprint.components.find(c => c.id.toString() === 'dbms')!;

    expect(dbms.services).toBeDefined();
    // All four offers share the PaaS delivery model → one Service.
    const serviceTypes = dbms.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Storage.PaaS.RelationalDbms']);

    const offerTypes = dbms
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    // Azure + GCP offers share the catalog type name PostgreSqlDbms.
    expect(offerTypes).toEqual([
      'Storage.PaaS.ArubaMsSqlDbms',
      'Storage.PaaS.ArubaMySqlDbms',
      'Storage.PaaS.PostgreSqlDbms',
      'Storage.PaaS.PostgreSqlDbms',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorRelationalDbmsFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-rdbms', environment, provider: 'AWS'}),
    ).toThrow(/No RelationalDbms offer/);
  });
});
