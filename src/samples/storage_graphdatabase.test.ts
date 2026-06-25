/**
 * storage_graphdatabase.test.ts
 *
 * M2 migration proof for the Storage "GraphDatabase" capability under the Fractal +
 * Interface model. Mirrors samples/network_and_compute_virtual_network_fractal.test.ts
 * and samples/foundations_pattern.test.ts:
 *
 *   - An infra team authors ONE Fractal whose GraphDatabase abstract component
 *     carries the candidate Offers (AzureCosmosDbGremlinDatabase/Azure).
 *   - A dev specializes through the Interface only (set a neutral param), never
 *     naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. The neutral params,
 *     declared dependencies and links flow through to whichever offer is selected.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No GraphDatabase offer ...`.
 *
 * A GraphDatabase depends on a GraphDbms (the DBMS that hosts it). That dependency
 * is declared on the abstract component and must flow through to whichever offer
 * the provider selects.
 *
 * GraphDatabase ships a single managed offer today (Azure Cosmos DB Gremlin); the
 * provider-swap contract is exercised by the Azure selection plus the unknown-
 * provider throw, so adding a second offer later is a drop-in extension.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {GraphDatabase} from '../fractal/component/storage/paas/graph_database';
import {AzureCosmosDbGremlinDatabase} from '../live_system/component/storage/paas/azure_cosmosdb_gremlin';
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

// A GraphDatabase depends on the GraphDbms that hosts it — declare that DBMS as a
// dependency. Plus a link the abstract component declares — both must be inherited
// by whichever offer the provider selects.
const graphDbmsDependencyId = getComponentIdBuilder()
  .withValue(kebab('social-graph-dbms'))
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
function authorGraphDatabaseFractal() {
  return createFractal({
    id: 'graphdb',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed graph database',
    boundedContextId,
    blueprint: bp => ({
      graphdb: bp.add(
        GraphDatabase.create({
          id: 'graphdb',
          displayName: 'Social Graph Database',
          offers: [AzureCosmosDbGremlinDatabase],
          dependencies: [{id: graphDbmsDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withDatabaseName: (name: string) => bp.graphdb.set('databaseName', name),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorGraphDatabaseFractal();
  fractal.operations.withDatabaseName('social');
  return fractal.toLiveSystem({name: 'acme-graphdb', environment, provider});
}

describe('GraphDatabase Fractal — provider-driven offer swap', () => {
  it('selects the offer type/provider for the requested provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['Azure', 'Storage.PaaS.CosmosDbGremlinDatabase'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const graphdb = ls.components.find(c => c.id.toString() === 'graphdb')!;
      expect(graphdb).toBeDefined();
      expect(graphdb.type.toString()).toBe(expectedType);
      expect(graphdb.provider).toBe(provider);
      // No vendor sub-components for this offer.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows neutral params, declared deps and links to whichever offer the provider selects', () => {
    const azureGraphDb = specialize('Azure').components.find(
      c => c.id.toString() === 'graphdb',
    )!;

    // neutral param set via the interface
    expect(azureGraphDb.parameters.getOptionalFieldByName('databaseName')).toBe(
      'social',
    );

    // declared GraphDbms dependency + link inherited by the selected offer
    expect(
      azureGraphDb.dependencies.some(
        d => d.id.toString() === 'social-graph-dbms',
      ),
    ).toBe(true);
    expect(
      azureGraphDb.links.some(l => l.id.toString() === 'linked-thing'),
    ).toBe(true);
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('Azure');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('graphdb');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Azure');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorGraphDatabaseFractal().blueprint;
    const graphdb = blueprint.components.find(
      c => c.id.toString() === 'graphdb',
    )!;

    expect(graphdb.services).toBeDefined();
    const serviceTypes = graphdb.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Storage.PaaS.GraphDatabase']);

    const offerTypes = graphdb
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['Storage.PaaS.CosmosDbGremlinDatabase']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorGraphDatabaseFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-graphdb',
        environment,
        provider: 'AWS',
      }),
    ).toThrow(/No GraphDatabase offer/);
  });
});
