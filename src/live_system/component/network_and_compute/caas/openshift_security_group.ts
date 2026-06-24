import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.CaaS.OpenshiftSecurityGroup
const OPENSHIFT_SG_TYPE_NAME = 'OpenshiftSecurityGroup';
const NAME_PARAM = 'name';
const POLICY_TYPE_PARAM = 'policyType';
const POD_SELECTOR_PARAM = 'podSelector';
const EGRESS_RULES_PARAM = 'egressRules';

function buildOpenshiftSgType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(OPENSHIFT_SG_TYPE_NAME).build(),
    )
    .build();
}

const OPENSHIFT_SG_TYPE = buildOpenshiftSgType();

// Re-export the neutral ingress-rule shape for consumers importing it here.
export type {IngressRule} from '../../../../fractal/component/network_and_compute/iaas/security_group';

/** OpenShift-only knobs that are not part of the neutral Interface. */
export type OpenshiftSecurityGroupVendorConfig = {
  name: string;
  policyType?: string;
  podSelector?: string;
  egressRules?: string;
};

/**
 * OpenshiftSecurityGroup — RedHat OpenShift NetworkPolicy Offer satisfying the
 * abstract SecurityGroup. Inherits all vendor-neutral parameters (description,
 * ingressRules) and additionally carries the OpenShift-only `name`,
 * `policyType`, `podSelector` and `egressRules` knobs, which are NOT exposed on
 * the Fractal Interface.
 */
export function OpenshiftSecurityGroup(
  vendor: OpenshiftSecurityGroupVendorConfig,
): Offer {
  return {
    type: OPENSHIFT_SG_TYPE,
    provider: 'RedHat',
    instantiate: ctx => {
      const primary = instantiateFromNeutral(ctx, OPENSHIFT_SG_TYPE, 'RedHat');
      primary.parameters.push(NAME_PARAM, vendor.name as never);
      if (vendor.policyType !== undefined) {
        primary.parameters.push(POLICY_TYPE_PARAM, vendor.policyType as never);
      }
      if (vendor.podSelector !== undefined) {
        primary.parameters.push(
          POD_SELECTOR_PARAM,
          vendor.podSelector as never,
        );
      }
      if (vendor.egressRules !== undefined) {
        primary.parameters.push(
          EGRESS_RULES_PARAM,
          vendor.egressRules as never,
        );
      }
      return [primary];
    },
  };
}
