import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer: Storage.CaaS.MinioTenant — provisions a MinIO Tenant CR on a
// running Kubernetes cluster (typically a managed KaaS like Aruba KaaS) and
// exposes an S3-compatible endpoint that satisfies the abstract FilesAndBlobs
// blueprint via the catalogue's service ancestry.
const MINIO_TENANT_TYPE_NAME = 'MinioTenant';

function buildMinioTenantType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(MINIO_TENANT_TYPE_NAME).build(),
    )
    .build();
}

const MINIO_TENANT_TYPE = buildMinioTenantType();

/**
 * MinIO Tenant — CaaS S3-compatible object store Offer satisfying the abstract
 * FilesAndBlobs. Inherits the vendor-neutral parameters (`storageClass`, ...).
 * Vendor-only knobs (namespace, tenantName, bucketName, minioVersion, servers,
 * volumesPerServer, volumeSize, requestAutoCert) are offer-level extras and are
 * not part of the neutral Interface.
 */
export const CaaSMinioTenant: Offer = {
  type: MINIO_TENANT_TYPE,
  provider: 'CaaS',
  instantiate: ctx => [instantiateFromNeutral(ctx, MINIO_TENANT_TYPE, 'CaaS')],
};
