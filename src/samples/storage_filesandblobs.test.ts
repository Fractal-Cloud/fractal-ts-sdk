/**
 * storage_filesandblobs.test.ts
 *
 * M2 migration proof for the Storage "FilesAndBlobs" capability under the
 * Fractal + Interface model. Mirrors
 * samples/network_and_compute_virtual_network_fractal.test.ts:
 *
 *   - An infra team authors ONE Fractal whose FilesAndBlobs abstract component
 *     carries the candidate Offers (AwsS3/AWS, AzureStorageAccount/Azure,
 *     AzureBlobContainer/Azure, AzureFileStorage/Azure, GcpCloudStorage/GCP,
 *     ArubaObjectStorageAccount/Aruba, CaaSMinioTenant/CaaS).
 *   - A dev specializes through the Interface only (set `accessTier`,
 *     `versioningEnabled`, `storageClass`), never naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the neutral params,
 *     declared dependencies and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Services (PaaS +
 *     CaaS delivery models → two Services).
 *   - An unknown provider throws `No FilesAndBlobs offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {FilesAndBlobs} from '../fractal/component/storage/paas/files_and_blobs';
import {AwsS3} from '../live_system/component/storage/paas/aws_s3';
import {AzureStorageAccount} from '../live_system/component/storage/paas/azure_storage_account';
import {AzureBlobContainer} from '../live_system/component/storage/paas/azure_blob_container';
import {AzureFileStorage} from '../live_system/component/storage/paas/azure_file_storage';
import {GcpCloudStorage} from '../live_system/component/storage/paas/gcp_cloud_storage';
import {ArubaObjectStorageAccount} from '../live_system/component/storage/paas/aruba_object_storage_account';
import {CaaSMinioTenant} from '../live_system/component/storage/caas/caas_minio_tenant';
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
function authorStorageFractal() {
  return createFractal({
    id: 'storage',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed object/blob/file store',
    boundedContextId,
    blueprint: bp => ({
      store: bp.add(
        FilesAndBlobs.create({
          id: 'store',
          displayName: 'App Files And Blobs',
          offers: [
            AwsS3,
            AzureStorageAccount,
            AzureBlobContainer,
            AzureFileStorage,
            GcpCloudStorage,
            ArubaObjectStorageAccount,
            CaaSMinioTenant,
          ],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withAccessTier: (tier: string) => bp.store.set('accessTier', tier),
      withVersioningEnabled: (enabled: boolean) =>
        bp.store.set('versioningEnabled', enabled),
      withStorageClass: (storageClass: string) =>
        bp.store.set('storageClass', storageClass),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorStorageFractal();
  fractal.operations.withAccessTier('Hot');
  fractal.operations.withVersioningEnabled(true);
  fractal.operations.withStorageClass('STANDARD');
  return fractal.toLiveSystem({name: 'acme-store', environment, provider});
}

describe('FilesAndBlobs Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider for each provider from one authored Fractal', () => {
    // Azure resolves to the first Azure candidate (AzureStorageAccount).
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['AWS', 'Storage.PaaS.S3'],
      ['Azure', 'Storage.PaaS.StorageAccount'],
      ['GCP', 'Storage.PaaS.CloudStorage'],
      ['Aruba', 'Storage.PaaS.ArubaObjectStorageAccount'],
      ['CaaS', 'Storage.CaaS.MinioTenant'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const store = ls.components.find(c => c.id.toString() === 'store')!;
      expect(store).toBeDefined();
      expect(store.type.toString()).toBe(expectedType);
      expect(store.provider).toBe(provider);
      // No vendor sub-components for any of these offers.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows identical neutral params, declared deps and links to whichever offer the provider selects', () => {
    const awsStore = specialize('AWS').components.find(
      c => c.id.toString() === 'store',
    )!;
    const azureStore = specialize('Azure').components.find(
      c => c.id.toString() === 'store',
    )!;
    const gcpStore = specialize('GCP').components.find(
      c => c.id.toString() === 'store',
    )!;

    // neutral params set via the interface — identical across providers
    expect(awsStore.parameters.getOptionalFieldByName('accessTier')).toBe(
      'Hot',
    );
    expect(
      awsStore.parameters.getOptionalFieldByName('versioningEnabled'),
    ).toBe(true);
    expect(awsStore.parameters.getOptionalFieldByName('storageClass')).toBe(
      'STANDARD',
    );
    expect(awsStore.parameters.getOptionalFieldByName('accessTier')).toEqual(
      azureStore.parameters.getOptionalFieldByName('accessTier'),
    );
    expect(
      azureStore.parameters.getOptionalFieldByName('storageClass'),
    ).toEqual(gcpStore.parameters.getOptionalFieldByName('storageClass'));

    // declared dependency + link inherited by every offer
    for (const store of [awsStore, azureStore, gcpStore]) {
      expect(
        store.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
      ).toBe(true);
      expect(store.links.some(l => l.id.toString() === 'linked-thing')).toBe(
        true,
      );
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('AWS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('storage');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('AWS');
  });

  it('serializes candidate offers onto the Blueprint component Services', () => {
    const blueprint = authorStorageFractal().blueprint;
    const store = blueprint.components.find(c => c.id.toString() === 'store')!;

    expect(store.services).toBeDefined();
    // Six PaaS offers + one CaaS offer → two Services grouped by delivery model.
    const serviceTypes = store.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual([
      'Storage.CaaS.FilesAndBlobs',
      'Storage.PaaS.FilesAndBlobs',
    ]);

    const offerTypes = store
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'Storage.CaaS.MinioTenant',
      'Storage.PaaS.ArubaObjectStorageAccount',
      'Storage.PaaS.CloudStorage',
      'Storage.PaaS.FileStorage',
      'Storage.PaaS.S3',
      'Storage.PaaS.StorageAccount',
      'Storage.PaaS.StorageBlobContainer',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorStorageFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-store', environment, provider: 'OCI'}),
    ).toThrow(/No FilesAndBlobs offer/);
  });
});
