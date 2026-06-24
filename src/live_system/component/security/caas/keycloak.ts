import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: Security.CaaS.Keycloak
const KEYCLOAK_TYPE_NAME = 'Keycloak';

function buildKeycloakType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Security)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(KEYCLOAK_TYPE_NAME).build(),
    )
    .build();
}

const KEYCLOAK_TYPE = buildKeycloakType();

/**
 * Keycloak — self-hosted (CaaS) identity provider Offer satisfying the abstract
 * IdentityProvider. Used here primarily to prove offer-swap: it inherits the same
 * vendor-neutral parameters as {@link Cognito}, differing only in catalog type
 * and provider.
 */
export const Keycloak: Offer = {
  type: KEYCLOAK_TYPE,
  provider: 'CaaS',
  instantiate: ctx => [instantiateFromNeutral(ctx, KEYCLOAK_TYPE, 'CaaS')],
};
