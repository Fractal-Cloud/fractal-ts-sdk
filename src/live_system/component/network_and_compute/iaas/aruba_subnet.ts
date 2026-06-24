import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.ArubaSubnet
const ARUBA_SUBNET_TYPE_NAME = 'ArubaSubnet';

function buildArubaSubnetType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(ARUBA_SUBNET_TYPE_NAME).build(),
    )
    .build();
}

const ARUBA_SUBNET_TYPE = buildArubaSubnetType();

/**
 * Aruba Subnet — Aruba Cloud Offer satisfying the abstract Subnet. Inherits the
 * vendor-neutral `cidrBlock` and adds no vendor-only knobs in v1.
 */
export const ArubaSubnet: Offer = {
  type: ARUBA_SUBNET_TYPE,
  provider: 'Aruba',
  instantiate: ctx => [instantiateFromNeutral(ctx, ARUBA_SUBNET_TYPE, 'Aruba')],
};
