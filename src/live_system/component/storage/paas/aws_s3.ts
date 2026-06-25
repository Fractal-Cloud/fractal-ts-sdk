import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: S3_COMPONENT_NAME = "S3" — offer type Storage.PaaS.S3
const AWS_S3_TYPE_NAME = 'S3';

function buildAwsS3Type(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(PascalCaseString.getBuilder().withValue(AWS_S3_TYPE_NAME).build())
    .build();
}

const AWS_S3_TYPE = buildAwsS3Type();

/**
 * Amazon S3 — AWS-managed object store Offer satisfying the abstract
 * FilesAndBlobs. Inherits the vendor-neutral parameters (`accessTier`,
 * `versioningEnabled`, `storageClass`, ...). Vendor-only knobs (bucket, acl,
 * forceDestroy, objectLockEnabled) are offer-level extras and are not part of
 * the neutral Interface.
 */
export const AwsS3: Offer = {
  type: AWS_S3_TYPE,
  provider: 'AWS',
  instantiate: ctx => [instantiateFromNeutral(ctx, AWS_S3_TYPE, 'AWS')],
};
