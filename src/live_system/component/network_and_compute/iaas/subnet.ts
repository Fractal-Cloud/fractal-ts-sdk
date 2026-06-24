import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.AwsSubnet
const AWS_SUBNET_TYPE_NAME = 'AwsSubnet';

function buildAwsSubnetType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AWS_SUBNET_TYPE_NAME).build(),
    )
    .build();
}

const AWS_SUBNET_TYPE = buildAwsSubnetType();

/**
 * AWS Subnet — AWS-managed Offer satisfying the abstract Subnet. Inherits the
 * vendor-neutral `cidrBlock`; vendor-only knobs (e.g. availabilityZone) are not
 * part of the Interface and would be set on this offer directly if required.
 */
export const AwsSubnet: Offer = {
  type: AWS_SUBNET_TYPE,
  provider: 'AWS',
  instantiate: ctx => [instantiateFromNeutral(ctx, AWS_SUBNET_TYPE, 'AWS')],
};
