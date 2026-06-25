/**
 * storage_relationaldatabase.test.ts
 *
 * M2 migration proof for the Storage "RelationalDatabase" capability under the
 * Fractal + Interface model. Mirrors
 * samples/network_and_compute_virtual_network_fractal.test.ts:
 *
 *   - An infra team authors ONE Fractal whose RelationalDatabase abstract
 *     component carries the candidate Offers (AzurePostgreSqlDatabase/Azure,
 *     AzureCosmosDbPostgreSqlDatabase/Azure, GcpPostgreSqlDatabase/GCP).
 *   - A dev specializes through the Interface only (set `collation`, `charset`),
 *     never naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the neutral params,
 *     declared dependencies and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No RelationalDatabase offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {RelationalDatabase} from '../fractal/component/storage/paas/relational_database';
import {AzurePostgreSqlDatabase} from '../live_system/component/storage/paas/azure_postgresql_database';
import {AzureCosmosDbPostgreSqlDatabase} from '../live_system/component/storage/paas/azure_cosmosdb_postgresql_database';
import {GcpPostgreSqlDatabase} from '../live_system/component/storage/paas/gcp_postgresql_database';
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

// A dependency (the hosting RelationalDbms) and a link the abstract component
// declares — both must be inherited by whichever offer the provider selects.
const dbmsDependencyId = getComponentIdBuilder()
  .withValue(kebab('relational-dbms'))
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
function authorDatabaseFractal() {
  return createFractal({
    id: 'database',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed relational database',
    boundedContextId,
    blueprint: bp => ({
      database: bp.add(
        RelationalDatabase.create({
          id: 'database',
          displayName: 'App Relational Database',
          offers: [
            AzurePostgreSqlDatabase,
            AzureCosmosDbPostgreSqlDatabase,
            GcpPostgreSqlDatabase,
          ],
          dependencies: [{id: dbmsDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withCollation: (collation: string) =>
        bp.database.set('collation', collation),
      withCharset: (charset: string) => bp.database.set('charset', charset),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorDatabaseFractal();
  fractal.operations.withCollation('en_US.UTF-8');
  fractal.operations.withCharset('UTF8');
  return fractal.toLiveSystem({name: 'acme-db', environment, provider});
}

describe('RelationalDatabase Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider for each provider from one authored Fractal', () => {
    // Azure resolves to the first Azure candidate (AzurePostgreSqlDatabase).
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['Azure', 'Storage.PaaS.PostgreSqlDatabase'],
      ['GCP', 'Storage.PaaS.PostgreSqlDatabase'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const db = ls.components.find(c => c.id.toString() === 'database')!;
      expect(db).toBeDefined();
      expect(db.type.toString()).toBe(expectedType);
      expect(db.provider).toBe(provider);
      // No vendor sub-components for any of these offers.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows identical neutral params, declared deps and links to whichever offer the provider selects', () => {
    const azureDb = specialize('Azure').components.find(
      c => c.id.toString() === 'database',
    )!;
    const gcpDb = specialize('GCP').components.find(
      c => c.id.toString() === 'database',
    )!;

    // neutral params set via the interface — identical across providers
    expect(azureDb.parameters.getOptionalFieldByName('collation')).toBe(
      'en_US.UTF-8',
    );
    expect(azureDb.parameters.getOptionalFieldByName('charset')).toBe('UTF8');
    expect(azureDb.parameters.getOptionalFieldByName('collation')).toEqual(
      gcpDb.parameters.getOptionalFieldByName('collation'),
    );
    expect(azureDb.parameters.getOptionalFieldByName('charset')).toEqual(
      gcpDb.parameters.getOptionalFieldByName('charset'),
    );

    // declared dependency + link inherited by every offer
    for (const db of [azureDb, gcpDb]) {
      expect(
        db.dependencies.some(d => d.id.toString() === 'relational-dbms'),
      ).toBe(true);
      expect(db.links.some(l => l.id.toString() === 'linked-thing')).toBe(true);
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('Azure');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('database');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Azure');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorDatabaseFractal().blueprint;
    const database = blueprint.components.find(
      c => c.id.toString() === 'database',
    )!;

    expect(database.services).toBeDefined();
    // All three offers share the PaaS delivery model → one Service.
    const serviceTypes = database.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Storage.PaaS.RelationalDatabase']);

    const offerTypes = database
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'Storage.PaaS.CosmosDbPostgreSqlDatabase',
      'Storage.PaaS.PostgreSqlDatabase',
      'Storage.PaaS.PostgreSqlDatabase',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorDatabaseFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-db', environment, provider: 'AWS'}),
    ).toThrow(/No RelationalDatabase offer/);
  });
});
