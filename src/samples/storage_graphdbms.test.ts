/**
 * storage_graphdbms.test.ts
 *
 * M2 migration proof for the Storage "GraphDbms" capability under the Fractal +
 * Interface model. Mirrors samples/network_and_compute_virtual_network_fractal.test.ts
 * and samples/foundations_pattern.test.ts:
 *
 *   - An infra team authors ONE Fractal whose GraphDbms abstract component carries
 *     the candidate Offers (AzureCosmosDbGremlin/Azure).
 *   - A dev specializes through the Interface only (set a neutral param), never
 *     naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. The neutral params,
 *     declared dependencies and links flow through to whichever offer is selected.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No GraphDbms offer ...`.
 *
 * GraphDbms ships a single managed offer today (Azure Cosmos DB Gremlin); the
 * provider-swap contract is exercised by the Azure selection plus the unknown-
 * provider throw, so adding a second offer later is a drop-in extension.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {GraphDbms} from '../fractal/component/storage/paas/graph_dbms';
import {AzureCosmosDbGremlin} from '../live_system/component/storage/paas/azure_cosmosdb_gremlin';
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
function authorGraphDbmsFractal() {
  return createFractal({
    id: 'graph',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed graph DBMS',
    boundedContextId,
    blueprint: bp => ({
      graph: bp.add(
        GraphDbms.create({
          id: 'graph',
          displayName: 'Social Graph DBMS',
          offers: [AzureCosmosDbGremlin],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withThroughput: (units: string) => bp.graph.set('throughput', units),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorGraphDbmsFractal();
  fractal.operations.withThroughput('400');
  return fractal.toLiveSystem({name: 'acme-graph', environment, provider});
}

describe('GraphDbms Fractal — provider-driven offer swap', () => {
  it('selects the offer type/provider for the requested provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['Azure', 'Storage.PaaS.CosmosDbGremlinDatabase'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const graph = ls.components.find(c => c.id.toString() === 'graph')!;
      expect(graph).toBeDefined();
      expect(graph.type.toString()).toBe(expectedType);
      expect(graph.provider).toBe(provider);
      // No vendor sub-components for this offer.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows neutral params, declared deps and links to whichever offer the provider selects', () => {
    const azureGraph = specialize('Azure').components.find(
      c => c.id.toString() === 'graph',
    )!;

    // neutral param set via the interface
    expect(azureGraph.parameters.getOptionalFieldByName('throughput')).toBe(
      '400',
    );

    // declared dependency + link inherited by the selected offer
    expect(
      azureGraph.dependencies.some(
        d => d.id.toString() === 'some-prerequisite',
      ),
    ).toBe(true);
    expect(azureGraph.links.some(l => l.id.toString() === 'linked-thing')).toBe(
      true,
    );
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('Azure');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('graph');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Azure');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorGraphDbmsFractal().blueprint;
    const graph = blueprint.components.find(c => c.id.toString() === 'graph')!;

    expect(graph.services).toBeDefined();
    const serviceTypes = graph.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Storage.PaaS.GraphDbms']);

    const offerTypes = graph
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['Storage.PaaS.CosmosDbGremlinDatabase']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorGraphDbmsFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-graph', environment, provider: 'AWS'}),
    ).toThrow(/No GraphDbms offer/);
  });
});
