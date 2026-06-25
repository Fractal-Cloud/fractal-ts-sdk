import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: CLOUDFRONT_COMPONENT_NAME = "CloudFront"
const AWS_CLOUDFRONT_TYPE_NAME = 'CloudFront';

// Vendor-only parameter keys this offer supports. These are NOT Fractal
// Interface ops (no other offer shares them); they are carried through as
// vendor-specific extras when set on the abstract component.
export const AWS_REGION_PARAM = 'awsRegion';
export const API_KEY_SOURCE_PARAM = 'apiKeySource';
export const BINARY_MEDIA_TYPES_PARAM = 'binaryMediaTypes';
export const MINIMUM_COMPRESSION_SIZE_PARAM = 'minimumCompressionSize';
export const DISABLE_EXECUTE_API_ENDPOINT_PARAM = 'disableExecuteApiEndpoint';

function buildAwsCloudFrontType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AWS_CLOUDFRONT_TYPE_NAME).build(),
    )
    .build();
}

const AWS_CLOUDFRONT_TYPE = buildAwsCloudFrontType();

/**
 * AWS CloudFront — AWS-managed API gateway Offer satisfying the abstract
 * ApiGateway. Inherits any vendor-neutral parameters, dependencies and links
 * from the abstract component. No vendor sub-components.
 */
export const AwsCloudFront: Offer = {
  type: AWS_CLOUDFRONT_TYPE,
  provider: 'AWS',
  instantiate: ctx => [instantiateFromNeutral(ctx, AWS_CLOUDFRONT_TYPE, 'AWS')],
};
