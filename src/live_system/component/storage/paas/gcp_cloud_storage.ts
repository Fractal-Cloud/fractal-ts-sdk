import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: CLOUD_STORAGE_COMPONENT_NAME = "CloudStorage" — offer type
// Storage.PaaS.CloudStorage
const CLOUD_STORAGE_TYPE_NAME = 'CloudStorage';

function buildGcpCloudStorageType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(CLOUD_STORAGE_TYPE_NAME).build(),
    )
    .build();
}

const CLOUD_STORAGE_TYPE = buildGcpCloudStorageType();

/**
 * Google Cloud Storage — GCP-managed object store Offer satisfying the abstract
 * FilesAndBlobs. Inherits the vendor-neutral parameters (`accessTier`,
 * `versioningEnabled`, `storageClass`, ...). Vendor-only knobs (region,
 * uniformBucketLevelAccess) are offer-level extras and are not part of the
 * neutral Interface.
 */
export const GcpCloudStorage: Offer = {
  type: CLOUD_STORAGE_TYPE,
  provider: 'GCP',
  instantiate: ctx => [instantiateFromNeutral(ctx, CLOUD_STORAGE_TYPE, 'GCP')],
};
