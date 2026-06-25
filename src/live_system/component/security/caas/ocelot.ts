import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: Security.CaaS.Ocelot
const OCELOT_TYPE_NAME = 'Ocelot';

function buildOcelotType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Security)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(PascalCaseString.getBuilder().withValue(OCELOT_TYPE_NAME).build())
    .build();
}

const OCELOT_TYPE = buildOcelotType();

/**
 * Ocelot — self-hosted (CaaS) API gateway / service mesh Offer satisfying the
 * abstract {@link ServiceMesh}. It inherits all vendor-neutral parameters,
 * dependencies and links from the abstract component. Its vendor-only knobs
 * (`namespace`, `cookieMaxAgeSec`, `corsOrigins`, `hostOwnerEmail`, `host`) are
 * offer concerns, not Fractal Interface ops, because no sibling offer shares
 * them. Ocelot creates no live-system sub-components.
 */
export const Ocelot: Offer = {
  type: OCELOT_TYPE,
  provider: 'CaaS',
  instantiate: ctx => [instantiateFromNeutral(ctx, OCELOT_TYPE, 'CaaS')],
};
