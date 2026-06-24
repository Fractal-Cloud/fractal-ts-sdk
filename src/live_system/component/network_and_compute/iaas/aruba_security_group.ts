import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Matches aria-agent-aruba handlers/security_group.go:
// NetworkAndCompute.IaaS.ArubaSecurityGroup
const ARUBA_SECURITY_GROUP_TYPE_NAME = 'ArubaSecurityGroup';
const NAME_PARAM = 'name';

function buildArubaSgType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_SECURITY_GROUP_TYPE_NAME)
        .build(),
    )
    .build();
}

const ARUBA_SG_TYPE = buildArubaSgType();

// Re-export the neutral ingress-rule shape for consumers importing it here.
export type {IngressRule} from '../../../../fractal/component/network_and_compute/iaas/security_group';

/** Aruba-only knobs that are not part of the neutral Interface. */
export type ArubaSecurityGroupVendorConfig = {
  name: string;
};

/**
 * ArubaSecurityGroup — Aruba Cloud security group Offer satisfying the abstract
 * SecurityGroup. Inherits all vendor-neutral parameters (description,
 * ingressRules) and additionally carries the Aruba-only `name` knob, which is
 * NOT exposed on the Fractal Interface.
 */
export function ArubaSecurityGroup(
  vendor: ArubaSecurityGroupVendorConfig,
): Offer {
  return {
    type: ARUBA_SG_TYPE,
    provider: 'Aruba',
    instantiate: ctx => {
      const primary = instantiateFromNeutral(ctx, ARUBA_SG_TYPE, 'Aruba');
      primary.parameters.push(NAME_PARAM, vendor.name as never);
      return [primary];
    },
  };
}
