import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: Security.PaaS.Cognito
const COGNITO_TYPE_NAME = 'Cognito';

function buildCognitoType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Security)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(COGNITO_TYPE_NAME).build(),
    )
    .build();
}

const COGNITO_TYPE = buildCognitoType();

/**
 * Amazon Cognito — AWS-managed identity provider Offer satisfying the abstract
 * IdentityProvider. Inherits all vendor-neutral parameters; adds no vendor-only
 * knobs in v1.
 */
export const Cognito: Offer = {
  type: COGNITO_TYPE,
  provider: 'AWS',
  instantiate: ctx => [instantiateFromNeutral(ctx, COGNITO_TYPE, 'AWS')],
};
