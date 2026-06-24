import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.AzureNsg
const AZURE_NSG_TYPE_NAME = 'AzureNsg';
const LOCATION_PARAM = 'location';
const RESOURCE_GROUP_PARAM = 'resourceGroup';

function buildAzureNsgType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AZURE_NSG_TYPE_NAME).build(),
    )
    .build();
}

const AZURE_NSG_TYPE = buildAzureNsgType();

// Re-export the neutral ingress-rule shape for consumers importing it here.
export type {IngressRule} from '../../../../fractal/component/network_and_compute/iaas/security_group';

/** Azure-only knobs that are not part of the neutral Interface. */
export type AzureNsgVendorConfig = {
  location: string;
  resourceGroup: string;
};

/**
 * AzureNsg — Azure Network Security Group Offer satisfying the abstract
 * SecurityGroup. Inherits all vendor-neutral parameters (description,
 * ingressRules) and additionally carries the Azure-only `location` and
 * `resourceGroup` knobs, which are NOT exposed on the Fractal Interface.
 */
export function AzureNsg(vendor: AzureNsgVendorConfig): Offer {
  return {
    type: AZURE_NSG_TYPE,
    provider: 'Azure',
    instantiate: ctx => {
      const primary = instantiateFromNeutral(ctx, AZURE_NSG_TYPE, 'Azure');
      primary.parameters.push(LOCATION_PARAM, vendor.location as never);
      primary.parameters.push(
        RESOURCE_GROUP_PARAM,
        vendor.resourceGroup as never,
      );
      return [primary];
    },
  };
}
