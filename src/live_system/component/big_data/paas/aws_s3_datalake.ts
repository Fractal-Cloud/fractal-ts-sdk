import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: S3_DATALAKE_COMPONENT_NAME = "S3"
const AWS_S3_DATALAKE_TYPE_NAME = 'S3';

function buildAwsS3DatalakeType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AWS_S3_DATALAKE_TYPE_NAME)
        .build(),
    )
    .build();
}

const AWS_S3_DATALAKE_TYPE = buildAwsS3DatalakeType();

/**
 * AWS S3 — AWS-managed object-store Offer satisfying the abstract Datalake.
 * Inherits all vendor-neutral parameters, dependencies and links from the
 * abstract component. Its vendor-only extras (`bucket`, `versioning`,
 * `forceDestroy`) are set on the offer's own parameters; no sub-components.
 */
export const AwsS3Datalake: Offer = {
  type: AWS_S3_DATALAKE_TYPE,
  provider: 'AWS',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AWS_S3_DATALAKE_TYPE, 'AWS'),
  ],
};
