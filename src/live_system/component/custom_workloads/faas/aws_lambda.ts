import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';

// Agent constant: Offer type = "CustomWorkloads.FaaS.AwsLambda"
const AWS_LAMBDA_TYPE_NAME = 'AwsLambda';

// ── internal helpers ──────────────────────────────────────────────────────────

function buildAwsLambdaType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.CustomWorkloads)
    .withServiceDeliveryModel(ServiceDeliveryModel.FaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AWS_LAMBDA_TYPE_NAME).build(),
    )
    .build();
}

// ── Functional Offer (Fractal + Interface migration) ──────────────────────────

const AWS_LAMBDA_OFFER_TYPE = buildAwsLambdaType();

/**
 * AWS Lambda Offer satisfying the abstract `Function`. Inherits the
 * vendor-neutral parameters (`sourceArtifact`, `packageType`, `runtime`,
 * `environment`), dependencies and links. The Lambda-only extras
 * (`functionName`, `roleArn`, `handler`, `memoryMb`, `timeoutSeconds`) are NOT
 * on the neutral Interface.
 */
export const AwsLambda: Offer = {
  type: AWS_LAMBDA_OFFER_TYPE,
  provider: 'AWS',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AWS_LAMBDA_OFFER_TYPE, 'AWS'),
  ],
};
