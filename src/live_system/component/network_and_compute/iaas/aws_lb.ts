import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer id: NetworkAndCompute.IaaS.LoadBalancer
const AWS_LB_TYPE_NAME = 'LoadBalancer';

function buildAwsLbType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(PascalCaseString.getBuilder().withValue(AWS_LB_TYPE_NAME).build())
    .build();
}

const AWS_LB_TYPE = buildAwsLbType();

/**
 * AWS Elastic Load Balancer — AWS-managed load balancer Offer satisfying the
 * abstract LoadBalancer. Inherits all vendor-neutral parameters, dependencies
 * and links from the abstract component.
 *
 * Vendor-only extras (set on this offer, not the neutral Interface):
 * loadBalancerType, internal, enableDeletionProtection, idleTimeout,
 * ipAddressType. No vendor sub-components.
 */
export const AwsLb: Offer = {
  type: AWS_LB_TYPE,
  provider: 'AWS',
  instantiate: ctx => [instantiateFromNeutral(ctx, AWS_LB_TYPE, 'AWS')],
};
