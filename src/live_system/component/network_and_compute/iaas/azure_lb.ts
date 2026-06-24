import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer id: NetworkAndCompute.IaaS.LoadBalancer
const AZURE_LB_TYPE_NAME = 'LoadBalancer';

function buildAzureLbType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AZURE_LB_TYPE_NAME).build(),
    )
    .build();
}

const AZURE_LB_TYPE = buildAzureLbType();

/**
 * Azure Load Balancer — Azure-managed load balancer Offer satisfying the
 * abstract LoadBalancer. Inherits all vendor-neutral parameters, dependencies
 * and links from the abstract component.
 *
 * Vendor-only extras (set on this offer, not the neutral Interface):
 * azureRegion, resourceGroupName, sku, frontendIpConfiguration. No vendor
 * sub-components.
 */
export const AzureLb: Offer = {
  type: AZURE_LB_TYPE,
  provider: 'Azure',
  instantiate: ctx => [instantiateFromNeutral(ctx, AZURE_LB_TYPE, 'Azure')],
};
