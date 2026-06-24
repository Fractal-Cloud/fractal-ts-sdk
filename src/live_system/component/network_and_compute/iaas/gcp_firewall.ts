import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.GcpFirewall
const GCP_FIREWALL_TYPE_NAME = 'GcpFirewall';

function buildGcpFirewallType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(GCP_FIREWALL_TYPE_NAME).build(),
    )
    .build();
}

const GCP_FIREWALL_TYPE = buildGcpFirewallType();

// Re-export the neutral ingress-rule shape for consumers importing it here.
export type {IngressRule} from '../../../../fractal/component/network_and_compute/iaas/security_group';

/**
 * GcpFirewall — GCP firewall Offer satisfying the abstract SecurityGroup.
 * Inherits all vendor-neutral parameters (description, ingressRules); adds no
 * vendor-only knobs.
 */
export const GcpFirewall: Offer = {
  type: GCP_FIREWALL_TYPE,
  provider: 'GCP',
  instantiate: ctx => [instantiateFromNeutral(ctx, GCP_FIREWALL_TYPE, 'GCP')],
};
