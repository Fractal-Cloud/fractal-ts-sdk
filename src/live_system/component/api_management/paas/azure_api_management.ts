import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: API_MANAGEMENT_COMPONENT_NAME = "ApiManagement"
const AZURE_API_MANAGEMENT_TYPE_NAME = 'ApiManagement';

// Vendor-only parameter keys this offer supports. These are NOT Fractal
// Interface ops (no other offer shares them); they are carried through as
// vendor-specific extras when set on the abstract component.
export const AZURE_REGION_PARAM = 'azureRegion';
export const AZURE_RESOURCE_GROUP_PARAM = 'azureResourceGroup';
export const PUBLISHER_NAME_PARAM = 'publisherName';
export const PUBLISHER_EMAIL_PARAM = 'publisherEmail';
export const SKU_NAME_PARAM = 'skuName';
export const PUBLIC_NETWORK_ACCESS_ENABLED_PARAM = 'publicNetworkAccessEnabled';

function buildAzureApiManagementType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_API_MANAGEMENT_TYPE_NAME)
        .build(),
    )
    .build();
}

const AZURE_API_MANAGEMENT_TYPE = buildAzureApiManagementType();

/**
 * Azure API Management — Azure-managed API gateway Offer satisfying the abstract
 * ApiGateway. Inherits any vendor-neutral parameters, dependencies and links
 * from the abstract component. No vendor sub-components.
 */
export const AzureApiManagement: Offer = {
  type: AZURE_API_MANAGEMENT_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_API_MANAGEMENT_TYPE, 'Azure'),
  ],
};
