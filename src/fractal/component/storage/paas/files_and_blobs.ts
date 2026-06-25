import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `FilesAndBlobs` — the abstract Storage capability "I need an object/blob/file
 * store". It is satisfied by candidate Offers (e.g. AwsS3 on AWS;
 * AzureStorageAccount / AzureBlobContainer / AzureFileStorage on Azure;
 * GcpCloudStorage on GCP; ArubaObjectStorageAccount on Aruba; CaaSMinioTenant on
 * CaaS). The dev specializes it through a Fractal Interface using vendor-neutral
 * concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): `azureRegion`,
 * `azureResourceGroup`, `accessTier`, `versioningEnabled`, `storageClass`. Set
 * via `component.set(key, value)`.
 *
 * Vendor-only knobs (bucket/acl/forceDestroy/objectLockEnabled on AWS; kind/sku
 * on Azure; publicAccess on blob container; shareQuota on file storage;
 * region/uniformBucketLevelAccess on GCP; accountName/password/regionCode on
 * Aruba; namespace/tenantName/bucketName/minioVersion/servers/volumesPerServer/
 * volumeSize/requestAutoCert on MinIO) live on the individual offers, NOT on this
 * Interface.
 */
export const NEUTRAL_PARAM_KEYS = [
  'azureRegion',
  'azureResourceGroup',
  'accessTier',
  'versioningEnabled',
  'storageClass',
] as const;

export type FilesAndBlobsConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this files-and-blobs store. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace FilesAndBlobs {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'FilesAndBlobs';

  export const create = (config: FilesAndBlobsConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.Storage,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
