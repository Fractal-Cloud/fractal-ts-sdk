import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const AMBASSADOR_TYPE_NAME = 'Ambassador';

function buildAmbassadorType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AMBASSADOR_TYPE_NAME).build(),
    )
    .build();
}

const AMBASSADOR_TYPE = buildAmbassadorType();

/**
 * Ambassador — CaaS API gateway Offer satisfying the abstract APIGateway.
 * Inherits the vendor-neutral `namespace` parameter. Ambassador's vendor-only
 * knobs (`host`, `hostOwnerEmail`, `acmeProviderAuthority`, `tlsSecretName`,
 * `licenseKey`) are not part of the neutral Interface. No sub-components.
 */
export const Ambassador: Offer = {
  type: AMBASSADOR_TYPE,
  provider: 'CaaS',
  instantiate: ctx => [instantiateFromNeutral(ctx, AMBASSADOR_TYPE, 'CaaS')],
};
