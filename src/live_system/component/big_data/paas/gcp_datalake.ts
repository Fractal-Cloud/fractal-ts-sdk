import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: CLOUD_STORAGE_COMPONENT_NAME = "CloudStorage"
const CLOUD_STORAGE_TYPE_NAME = 'CloudStorage';

function buildGcpDatalakeType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(CLOUD_STORAGE_TYPE_NAME).build(),
    )
    .build();
}

const GCP_DATALAKE_TYPE = buildGcpDatalakeType();

/**
 * GCP Cloud Storage — GCP-managed object-store Offer satisfying the abstract
 * Datalake. Inherits all vendor-neutral parameters, dependencies and links from
 * the abstract component. Its vendor-only extras (`bucketName`, `region`,
 * `storageClass`, `versioningEnabled`, `uniformBucketLevelAccess`) are set on the
 * offer's own parameters; no sub-components.
 */
export const GcpDatalake: Offer = {
  type: GCP_DATALAKE_TYPE,
  provider: 'GCP',
  instantiate: ctx => [instantiateFromNeutral(ctx, GCP_DATALAKE_TYPE, 'GCP')],
};
