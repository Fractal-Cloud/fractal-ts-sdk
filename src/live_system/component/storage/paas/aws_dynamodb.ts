import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: Storage.PaaS.DynamoDb
const AWS_DYNAMODB_TYPE_NAME = 'DynamoDb';

function buildAwsDynamoDbType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AWS_DYNAMODB_TYPE_NAME).build(),
    )
    .build();
}

const AWS_DYNAMODB_TYPE = buildAwsDynamoDbType();

/**
 * Amazon DynamoDB — AWS-managed key-value DBMS Offer satisfying the abstract
 * KeyValueDbms. Inherits all vendor-neutral parameters, dependencies and links.
 * Vendor-only knobs (billingMode, region, ...) are offer-level extras and are not
 * part of the neutral Interface.
 */
export const AwsDynamoDb: Offer = {
  type: AWS_DYNAMODB_TYPE,
  provider: 'AWS',
  instantiate: ctx => [instantiateFromNeutral(ctx, AWS_DYNAMODB_TYPE, 'AWS')],
};
