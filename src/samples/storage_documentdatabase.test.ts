/**
 * storage_documentdatabase.test.ts
 *
 * M2 migration proof for the Storage "DocumentDatabase" capability under the
 * Fractal + Interface model. Mirrors samples/network_and_compute_virtual_network_fractal.test.ts
 * and samples/foundations_pattern.test.ts:
 *
 *   - An infra team authors ONE Fractal whose DocumentDatabase abstract component
 *     carries the candidate Offers (AzureCosmosDbMongoDatabase/Azure,
 *     GcpFirestoreCollection/GCP).
 *   - A dev specializes through the Interface only, never naming a vendor offer.
 *     DocumentDatabase exposes no neutral knobs, so the Interface only carries the
 *     authored dependency + link.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the declared dependency
 *     and link flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No DocumentDatabase offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {DocumentDatabase} from '../fractal/component/storage/paas/document_database';
import {AzureCosmosDbMongoDatabase} from '../live_system/component/storage/paas/azure_cosmosdb_mongo_database';
import {GcpFirestoreCollection} from '../live_system/component/storage/paas/gcp_firestore_collection';
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

// A dependency (the DocumentDbms the capability depends on) and a link the
// abstract component declares — both must be inherited by whichever offer the
// provider selects.
const declaredDependencyId = getComponentIdBuilder()
  .withValue(kebab('document-dbms'))
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
function authorDocumentDatabaseFractal() {
  return createFractal({
    id: 'documents',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed document database',
    boundedContextId,
    blueprint: bp => ({
      documents: bp.add(
        DocumentDatabase.create({
          id: 'documents',
          displayName: 'Catalog Document Database',
          offers: [AzureCosmosDbMongoDatabase, GcpFirestoreCollection],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: () => ({}),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorDocumentDatabaseFractal();
  return fractal.toLiveSystem({name: 'acme-docs', environment, provider});
}

describe('DocumentDatabase Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider for each provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['Azure', 'Storage.PaaS.CosmosDbMongoDatabase'],
      ['GCP', 'Storage.PaaS.Collection'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const db = ls.components.find(c => c.id.toString() === 'documents')!;
      expect(db).toBeDefined();
      expect(db.type.toString()).toBe(expectedType);
      expect(db.provider).toBe(provider);
      // No vendor sub-components for either offer.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows declared deps and links to whichever offer the provider selects', () => {
    const azureDb = specialize('Azure').components.find(
      c => c.id.toString() === 'documents',
    )!;
    const gcpDb = specialize('GCP').components.find(
      c => c.id.toString() === 'documents',
    )!;

    for (const db of [azureDb, gcpDb]) {
      expect(
        db.dependencies.some(d => d.id.toString() === 'document-dbms'),
      ).toBe(true);
      expect(db.links.some(l => l.id.toString() === 'linked-thing')).toBe(true);
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('Azure');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('documents');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Azure');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorDocumentDatabaseFractal().blueprint;
    const documents = blueprint.components.find(
      c => c.id.toString() === 'documents',
    )!;

    expect(documents.services).toBeDefined();
    // Both offers share the PaaS delivery model → one Service.
    const serviceTypes = documents.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Storage.PaaS.DocumentDatabase']);

    const offerTypes = documents
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'Storage.PaaS.Collection',
      'Storage.PaaS.CosmosDbMongoDatabase',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorDocumentDatabaseFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-docs', environment, provider: 'AWS'}),
    ).toThrow(/No DocumentDatabase offer/);
  });
});
