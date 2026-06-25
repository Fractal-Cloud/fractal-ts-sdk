import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: UNMANAGED_COMPONENT_NAME = "Unmanaged" — offer type Messaging.SaaS.Unmanaged
const UNMANAGED_TYPE_NAME = 'Unmanaged';

function buildMessagingSaaSUnmanagedType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.SaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(UNMANAGED_TYPE_NAME).build(),
    )
    .build();
}

const MESSAGING_SAAS_UNMANAGED_TYPE = buildMessagingSaaSUnmanagedType();

/**
 * Unmanaged (external / SaaS) messaging endpoint — Offer satisfying the abstract
 * MessagingUnmanaged. It carries no vendor-neutral knobs and emits no vendor
 * sub-components; it simply inherits the abstract component's neutral parameters,
 * dependencies and links unchanged.
 */
export const MessagingSaaSUnmanaged: Offer = {
  type: MESSAGING_SAAS_UNMANAGED_TYPE,
  provider: 'SaaS',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, MESSAGING_SAAS_UNMANAGED_TYPE, 'SaaS'),
  ],
};
