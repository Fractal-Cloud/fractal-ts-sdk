import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.ArubaVpcPeering
// Matches aria-agent-aruba handlers/vpc_peering.go.
const ARUBA_VPC_PEERING_TYPE_NAME = 'ArubaVpcPeering';

function buildArubaVpcPeeringType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_VPC_PEERING_TYPE_NAME)
        .build(),
    )
    .build();
}

const ARUBA_VPC_PEERING_TYPE = buildArubaVpcPeeringType();

/**
 * Aruba VPC Peering — Aruba-managed VPC peering Offer satisfying the abstract
 * VpcPeering. Inherits all vendor-neutral parameters (e.g. `peerVpcId`); adds no
 * vendor-only knobs in v1.
 */
export const ArubaVpcPeering: Offer = {
  type: ARUBA_VPC_PEERING_TYPE,
  provider: 'Aruba',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, ARUBA_VPC_PEERING_TYPE, 'Aruba'),
  ],
};
