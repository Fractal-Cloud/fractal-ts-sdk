import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: VPC_COMPONENT_NAME = "AwsVpc" — offer type NetworkAndCompute.IaaS.AwsVpc
const AWS_VPC_TYPE_NAME = 'AwsVpc';

function buildAwsVpcType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AWS_VPC_TYPE_NAME).build(),
    )
    .build();
}

const AWS_VPC_TYPE = buildAwsVpcType();

/**
 * Amazon VPC — AWS-managed virtual network Offer satisfying the abstract
 * VirtualNetwork. Inherits the vendor-neutral `cidrBlock` parameter. Vendor-only
 * knobs (instanceTenancy, enableDnsSupport, enableDnsHostnames) are offer-level
 * extras and are not part of the neutral Interface.
 */
export const AwsVpc: Offer = {
  type: AWS_VPC_TYPE,
  provider: 'AWS',
  instantiate: ctx => [instantiateFromNeutral(ctx, AWS_VPC_TYPE, 'AWS')],
};
