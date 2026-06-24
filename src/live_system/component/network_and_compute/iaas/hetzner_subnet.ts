import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.HetznerSubnet
const HETZNER_SUBNET_TYPE_NAME = 'HetznerSubnet';

function buildHetznerSubnetType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(HETZNER_SUBNET_TYPE_NAME).build(),
    )
    .build();
}

const HETZNER_SUBNET_TYPE = buildHetznerSubnetType();

/**
 * Hetzner Subnet — Hetzner-managed Offer satisfying the abstract Subnet.
 * Inherits the vendor-neutral `cidrBlock`; vendor-only knobs (e.g. networkZone,
 * type) are not part of the Interface and would be set on this offer directly if
 * required.
 */
export const HetznerSubnet: Offer = {
  type: HETZNER_SUBNET_TYPE,
  provider: 'Hetzner',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, HETZNER_SUBNET_TYPE, 'Hetzner'),
  ],
};
