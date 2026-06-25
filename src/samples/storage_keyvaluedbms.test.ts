/**
 * storage_keyvaluedbms.test.ts
 *
 * M2 migration proof for the Storage "KeyValueDbms" capability under the Fractal +
 * Interface model. Mirrors samples/network_and_compute_virtual_network_fractal.test.ts
 * and samples/foundations_pattern.test.ts:
 *
 *   - An infra team authors ONE Fractal whose KeyValueDbms abstract component
 *     carries the candidate Offers (AwsDynamoDb/AWS, AzureCosmosDb/Azure,
 *     GcpBigtable/GCP).
 *   - A dev specializes through the Interface only, never naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the declared
 *     dependencies and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No KeyValueDbms offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {KeyValueDbms} from '../fractal/component/storage/paas/key_value_dbms';
import {AwsDynamoDb} from '../live_system/component/storage/paas/aws_dynamodb';
import {AzureCosmosDb} from '../live_system/component/storage/paas/azure_cosmosdb';
import {GcpBigtable} from '../live_system/component/storage/paas/gcp_bigtable_dbms';
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
function authorKeyValueFractal() {
  return createFractal({
    id: 'kvstore',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed key-value DBMS',
    boundedContextId,
    blueprint: bp => ({
      kvdb: bp.add(
        KeyValueDbms.create({
          id: 'kvdb',
          displayName: 'Session Store',
          offers: [AwsDynamoDb, AzureCosmosDb, GcpBigtable],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withCapacity: (capacity: string) => bp.kvdb.set('capacity', capacity),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorKeyValueFractal();
  fractal.operations.withCapacity('standard');
  return fractal.toLiveSystem({name: 'acme-kv', environment, provider});
}

describe('KeyValueDbms Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider for each provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['AWS', 'Storage.PaaS.DynamoDb'],
      ['Azure', 'Storage.PaaS.CosmosDb'],
      ['GCP', 'Storage.PaaS.BigtableDbms'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const kv = ls.components.find(c => c.id.toString() === 'kvdb')!;
      expect(kv).toBeDefined();
      expect(kv.type.toString()).toBe(expectedType);
      expect(kv.provider).toBe(provider);
      // No vendor sub-components for any of these offers.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows identical neutral params, declared deps and links to whichever offer the provider selects', () => {
    const awsKv = specialize('AWS').components.find(
      c => c.id.toString() === 'kvdb',
    )!;
    const azureKv = specialize('Azure').components.find(
      c => c.id.toString() === 'kvdb',
    )!;
    const gcpKv = specialize('GCP').components.find(
      c => c.id.toString() === 'kvdb',
    )!;

    // neutral param set via the interface — identical across providers
    expect(awsKv.parameters.getOptionalFieldByName('capacity')).toBe(
      'standard',
    );
    expect(awsKv.parameters.getOptionalFieldByName('capacity')).toEqual(
      azureKv.parameters.getOptionalFieldByName('capacity'),
    );
    expect(azureKv.parameters.getOptionalFieldByName('capacity')).toEqual(
      gcpKv.parameters.getOptionalFieldByName('capacity'),
    );

    // declared dependency + link inherited by every offer
    for (const kv of [awsKv, azureKv, gcpKv]) {
      expect(
        kv.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
      ).toBe(true);
      expect(kv.links.some(l => l.id.toString() === 'linked-thing')).toBe(true);
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('AWS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('kvstore');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('AWS');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorKeyValueFractal().blueprint;
    const kvdb = blueprint.components.find(c => c.id.toString() === 'kvdb')!;

    expect(kvdb.services).toBeDefined();
    // All three offers share the PaaS delivery model → one Service.
    const serviceTypes = kvdb.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Storage.PaaS.KeyValueDbms']);

    const offerTypes = kvdb
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'Storage.PaaS.BigtableDbms',
      'Storage.PaaS.CosmosDb',
      'Storage.PaaS.DynamoDb',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorKeyValueFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-kv', environment, provider: 'SaaS'}),
    ).toThrow(/No KeyValueDbms offer/);
  });
});
