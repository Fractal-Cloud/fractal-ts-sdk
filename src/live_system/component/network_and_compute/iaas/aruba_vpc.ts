import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Matches aria-agent-aruba handlers/vpc.go: NetworkAndCompute.IaaS.ArubaVpc
const ARUBA_VPC_TYPE_NAME = 'ArubaVpc';

function buildArubaVpcType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(ARUBA_VPC_TYPE_NAME).build(),
    )
    .build();
}

const ARUBA_VPC_TYPE = buildArubaVpcType();

/**
 * Aruba VPC — Aruba-managed virtual network Offer satisfying the abstract
 * VirtualNetwork. Inherits the vendor-neutral `cidrBlock` parameter. Vendor-only
 * knobs (name, location) are offer-level extras and are not part of the neutral
 * Interface.
 */
export const ArubaVpc: Offer = {
  type: ARUBA_VPC_TYPE,
  provider: 'Aruba',
  instantiate: ctx => [instantiateFromNeutral(ctx, ARUBA_VPC_TYPE, 'Aruba')],
};
