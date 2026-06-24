import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: GCP_VPC_COMPONENT_NAME = "GcpVpc"
const GCP_VPC_TYPE_NAME = 'GcpVpc';

function buildGcpVpcType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(GCP_VPC_TYPE_NAME).build(),
    )
    .build();
}

const GCP_VPC_TYPE = buildGcpVpcType();

/**
 * Google Cloud VPC — GCP-managed virtual network Offer satisfying the abstract
 * VirtualNetwork. Inherits the vendor-neutral `cidrBlock` parameter. Vendor-only
 * knobs (autoCreateSubnetworks, routingMode) are offer-level extras and are not
 * part of the neutral Interface.
 */
export const GcpVpc: Offer = {
  type: GCP_VPC_TYPE,
  provider: 'GCP',
  instantiate: ctx => [instantiateFromNeutral(ctx, GCP_VPC_TYPE, 'GCP')],
};
