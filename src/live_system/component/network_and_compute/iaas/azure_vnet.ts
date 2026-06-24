import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// BFF offer id: NetworkAndCompute.IaaS.VNet
const AZURE_VNET_TYPE_NAME = 'VNet';

function buildAzureVnetType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AZURE_VNET_TYPE_NAME).build(),
    )
    .build();
}

const AZURE_VNET_TYPE = buildAzureVnetType();

/**
 * Azure Virtual Network — Azure-managed virtual network Offer satisfying the
 * abstract VirtualNetwork. Inherits the vendor-neutral `cidrBlock` parameter.
 * Vendor-only knobs (location, resourceGroup) are offer-level extras and are not
 * part of the neutral Interface.
 */
export const AzureVnet: Offer = {
  type: AZURE_VNET_TYPE,
  provider: 'Azure',
  instantiate: ctx => [instantiateFromNeutral(ctx, AZURE_VNET_TYPE, 'Azure')],
};
