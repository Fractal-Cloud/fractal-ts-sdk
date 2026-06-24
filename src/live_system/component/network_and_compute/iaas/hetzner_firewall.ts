import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.HetznerFirewall
const HETZNER_FIREWALL_TYPE_NAME = 'HetznerFirewall';

function buildHetznerFirewallType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(HETZNER_FIREWALL_TYPE_NAME)
        .build(),
    )
    .build();
}

const HETZNER_FIREWALL_TYPE = buildHetznerFirewallType();

// Re-export the neutral ingress-rule shape for consumers importing it here.
export type {IngressRule} from '../../../../fractal/component/network_and_compute/iaas/security_group';

/**
 * HetznerFirewall — Hetzner Cloud firewall Offer satisfying the abstract
 * SecurityGroup. Inherits all vendor-neutral parameters (description,
 * ingressRules); adds no vendor-only knobs.
 */
export const HetznerFirewall: Offer = {
  type: HETZNER_FIREWALL_TYPE,
  provider: 'Hetzner',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, HETZNER_FIREWALL_TYPE, 'Hetzner'),
  ],
};
