/**
 * storage_keyvalueentity.test.ts
 *
 * M2 migration proof for the Storage "KeyValueEntity" capability under the
 * Fractal + Interface model. Mirrors
 * samples/network_and_compute_virtual_network_fractal.test.ts and
 * samples/foundations_pattern.test.ts:
 *
 *   - An infra team authors ONE Fractal whose KeyValueEntity abstract component
 *     carries the candidate Offers (AzureCosmosDbTable on Azure, plus a synthetic
 *     second-provider offer used only to prove the provider-driven swap mechanic).
 *   - A dev specializes through the Interface only, never naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the neutral params,
 *     declared dependencies and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No KeyValueEntity offer ...`.
 *
 * KeyValueEntity declares no vendor-neutral Interface ops in v1 (Neutral keys: []),
 * so the dev's specialization is expressed purely through the declared
 * dependencies and links — here a dependency on the KeyValueDbms that owns it.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {KeyValueEntity} from '../fractal/component/storage/paas/key_value_entity';
import {AzureCosmosDbTable} from '../live_system/component/storage/paas/azure_cosmosdb_table';
import {Offer, instantiateFromNeutral} from '../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../fractal/component/type';
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
import {ServiceDeliveryModel} from '../values/service_delivery_model';
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

// A KeyValueEntity lives inside a key-value datastore: the author declares a
// dependency on the owning KeyValueDbms. Both this dependency and the link below
// must be inherited by whichever offer the provider selects.
const dbmsDependencyId = getComponentIdBuilder()
  .withValue(kebab('owning-kv-dbms'))
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

// ── synthetic second-provider offer ──────────────────────────────────────────
// Only AzureCosmosDbTable is a real KeyValueEntity offer today; this synthetic
// AWS offer exists solely to prove the provider-driven swap mechanic (same
// authored Fractal, different provider → different offer type/provider, identical
// neutral inputs). It is NOT exported and never referenced by index.ts.
function syntheticType(name: string): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(PascalCaseString.getBuilder().withValue(name).build())
    .build();
}

const AWS_DYNAMODB_TABLE_TYPE = syntheticType('DynamoDbTable');

const AwsDynamoDbTable: Offer = {
  type: AWS_DYNAMODB_TABLE_TYPE,
  provider: 'AWS',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AWS_DYNAMODB_TABLE_TYPE, 'AWS'),
  ],
};

// ── Infra team: author the Fractal once. ─────────────────────────────────────
function authorKeyValueFractal() {
  return createFractal({
    id: 'kv-store',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed key-value entity',
    boundedContextId,
    blueprint: bp => ({
      entity: bp.add(
        KeyValueEntity.create({
          id: 'kv-store',
          displayName: 'Session Table',
          offers: [AzureCosmosDbTable, AwsDynamoDbTable],
          dependencies: [{id: dbmsDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    // KeyValueEntity has no vendor-neutral Interface ops in v1 (Neutral keys: []).
    operations: () => ({}),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorKeyValueFractal();
  return fractal.toLiveSystem({name: 'acme-kv', environment, provider});
}

describe('KeyValueEntity Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider for each provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['Azure', 'Storage.PaaS.CosmosDbTable'],
      ['AWS', 'Storage.PaaS.DynamoDbTable'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const entity = ls.components.find(c => c.id.toString() === 'kv-store')!;
      expect(entity).toBeDefined();
      expect(entity.type.toString()).toBe(expectedType);
      expect(entity.provider).toBe(provider);
      // No vendor sub-components for either offer.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows identical declared deps and links to whichever offer the provider selects', () => {
    const azureEntity = specialize('Azure').components.find(
      c => c.id.toString() === 'kv-store',
    )!;
    const awsEntity = specialize('AWS').components.find(
      c => c.id.toString() === 'kv-store',
    )!;

    // declared dependency on the owning KeyValueDbms + link inherited by every offer
    for (const entity of [azureEntity, awsEntity]) {
      expect(
        entity.dependencies.some(d => d.id.toString() === 'owning-kv-dbms'),
      ).toBe(true);
      expect(entity.links.some(l => l.id.toString() === 'linked-thing')).toBe(
        true,
      );
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('Azure');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('kv-store');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Azure');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorKeyValueFractal().blueprint;
    const entity = blueprint.components.find(
      c => c.id.toString() === 'kv-store',
    )!;

    expect(entity.services).toBeDefined();
    // Both offers share the PaaS delivery model → one Service.
    const serviceTypes = entity.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Storage.PaaS.KeyValueEntity']);

    const offerTypes = entity
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'Storage.PaaS.CosmosDbTable',
      'Storage.PaaS.DynamoDbTable',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorKeyValueFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-kv', environment, provider: 'GCP'}),
    ).toThrow(/No KeyValueEntity offer/);
  });
});
