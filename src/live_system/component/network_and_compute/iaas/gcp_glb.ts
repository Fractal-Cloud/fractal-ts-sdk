import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer id: NetworkAndCompute.IaaS.GlobalLoadBalancer
const GCP_GLB_TYPE_NAME = 'GlobalLoadBalancer';

function buildGcpGlbType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(GCP_GLB_TYPE_NAME).build(),
    )
    .build();
}

const GCP_GLB_TYPE = buildGcpGlbType();

/**
 * GCP Global Load Balancer — GCP-managed load balancer Offer satisfying the
 * abstract LoadBalancer. Inherits all vendor-neutral parameters, dependencies
 * and links from the abstract component.
 *
 * Vendor-only extras (set on this offer, not the neutral Interface):
 * loadBalancingScheme, ipProtocol, portRange, target, ipAddress. No vendor
 * sub-components.
 */
export const GcpGlb: Offer = {
  type: GCP_GLB_TYPE,
  provider: 'GCP',
  instantiate: ctx => [instantiateFromNeutral(ctx, GCP_GLB_TYPE, 'GCP')],
};
