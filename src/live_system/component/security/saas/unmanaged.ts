import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: Security.SaaS.Unmanaged
const UNMANAGED_TYPE_NAME = 'Unmanaged';

function buildUnmanagedType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Security)
    .withServiceDeliveryModel(ServiceDeliveryModel.SaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(UNMANAGED_TYPE_NAME).build(),
    )
    .build();
}

const UNMANAGED_TYPE = buildUnmanagedType();

/**
 * Unmanaged — the SaaS Offer satisfying the abstract SecurityUnmanaged
 * capability. It represents an externally-owned / unmanaged security component:
 * it inherits all vendor-neutral parameters (none in v1), adds no vendor-only
 * knobs, and emits no vendor sub-components.
 */
export const Unmanaged: Offer = {
  type: UNMANAGED_TYPE,
  provider: 'SaaS',
  instantiate: ctx => [instantiateFromNeutral(ctx, UNMANAGED_TYPE, 'SaaS')],
};
