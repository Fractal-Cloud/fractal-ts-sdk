import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.GcpSubnet
const GCP_SUBNET_TYPE_NAME = 'GcpSubnet';

function buildGcpSubnetType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(GCP_SUBNET_TYPE_NAME).build(),
    )
    .build();
}

const GCP_SUBNET_TYPE = buildGcpSubnetType();

/**
 * GCP Subnet — GCP-managed Offer satisfying the abstract Subnet. Inherits the
 * vendor-neutral `cidrBlock`; vendor-only knobs (e.g. region,
 * privateIpGoogleAccess) are not part of the Interface and would be set on this
 * offer directly if required.
 */
export const GcpSubnet: Offer = {
  type: GCP_SUBNET_TYPE,
  provider: 'GCP',
  instantiate: ctx => [instantiateFromNeutral(ctx, GCP_SUBNET_TYPE, 'GCP')],
};
