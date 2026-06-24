import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.EC2
const EC2_TYPE_NAME = 'EC2';

// Vendor-only parameter keys carried by this offer (set on the offer's own
// surface, NOT the abstract VirtualMachine Interface): amiId, instanceType,
// keyName, userData, iamInstanceProfile, associatePublicIp.

function buildEc2Type(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(PascalCaseString.getBuilder().withValue(EC2_TYPE_NAME).build())
    .build();
}

const EC2_TYPE = buildEc2Type();

/**
 * Amazon EC2 — AWS IaaS virtual machine Offer satisfying the abstract
 * VirtualMachine. Inherits all vendor-neutral parameters, dependencies and links
 * from the abstract component. No vendor sub-components.
 */
export const Ec2Instance: Offer = {
  type: EC2_TYPE,
  provider: 'AWS',
  instantiate: ctx => [instantiateFromNeutral(ctx, EC2_TYPE, 'AWS')],
};
