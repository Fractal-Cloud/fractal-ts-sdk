import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.AwsSecurityGroup (FRA-2881 forked
// the shared SecurityGroup offer into per-provider offers; the AWS agent now only
// reconciles the concrete AwsSecurityGroup offer id).
const AWS_SG_TYPE_NAME = 'AwsSecurityGroup';

function buildAwsSgType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(PascalCaseString.getBuilder().withValue(AWS_SG_TYPE_NAME).build())
    .build();
}

const AWS_SG_TYPE = buildAwsSgType();

// Re-export the neutral ingress-rule shape for consumers importing it here.
export type {IngressRule} from '../../../../fractal/component/network_and_compute/iaas/security_group';

/**
 * AwsSecurityGroup — AWS-managed security group Offer satisfying the abstract
 * SecurityGroup. Inherits all vendor-neutral parameters (description,
 * ingressRules); adds no vendor-only knobs.
 */
export const AwsSecurityGroup: Offer = {
  type: AWS_SG_TYPE,
  provider: 'AWS',
  instantiate: ctx => [instantiateFromNeutral(ctx, AWS_SG_TYPE, 'AWS')],
};
