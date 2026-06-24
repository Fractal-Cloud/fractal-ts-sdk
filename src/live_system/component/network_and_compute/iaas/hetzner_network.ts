import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: HETZNER_NETWORK_COMPONENT_NAME = "HetznerNetwork"
const HETZNER_NETWORK_TYPE_NAME = 'HetznerNetwork';

function buildHetznerNetworkType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(HETZNER_NETWORK_TYPE_NAME)
        .build(),
    )
    .build();
}

const HETZNER_NETWORK_TYPE = buildHetznerNetworkType();

/**
 * Hetzner Network — Hetzner-managed virtual network Offer satisfying the abstract
 * VirtualNetwork. Inherits the vendor-neutral `cidrBlock` parameter; adds no
 * vendor-only knobs in v1.
 */
export const HetznerNetwork: Offer = {
  type: HETZNER_NETWORK_TYPE,
  provider: 'Hetzner',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, HETZNER_NETWORK_TYPE, 'Hetzner'),
  ],
};
