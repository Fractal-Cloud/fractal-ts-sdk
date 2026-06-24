import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.OciSubnet
const OCI_SUBNET_TYPE_NAME = 'OciSubnet';

function buildOciSubnetType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(OCI_SUBNET_TYPE_NAME).build(),
    )
    .build();
}

const OCI_SUBNET_TYPE = buildOciSubnetType();

/**
 * OCI Subnet — OCI-managed Offer satisfying the abstract Subnet. Inherits the
 * vendor-neutral `cidrBlock`; vendor-only knobs (e.g. compartmentId,
 * availabilityDomain, prohibitPublicIpOnVnic) are not part of the Interface and
 * would be set on this offer directly if required.
 */
export const OciSubnet: Offer = {
  type: OCI_SUBNET_TYPE,
  provider: 'OCI',
  instantiate: ctx => [instantiateFromNeutral(ctx, OCI_SUBNET_TYPE, 'OCI')],
};
