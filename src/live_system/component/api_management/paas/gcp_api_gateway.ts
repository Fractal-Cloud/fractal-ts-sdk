import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: API_GATEWAY_COMPONENT_NAME = "ApiGateway"
const GCP_API_GATEWAY_TYPE_NAME = 'ApiGateway';

// Vendor-only parameter keys this offer supports. These are NOT Fractal
// Interface ops (no other offer shares them); they are carried through as
// vendor-specific extras when set on the abstract component.
export const REGION_PARAM = 'region';
export const NAME_PARAM = 'name';
export const API_ID_PARAM = 'apiId';
export const API_CONFIG_ID_PARAM = 'apiConfigId';

function buildGcpApiGatewayType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(GCP_API_GATEWAY_TYPE_NAME)
        .build(),
    )
    .build();
}

const GCP_API_GATEWAY_TYPE = buildGcpApiGatewayType();

/**
 * GCP API Gateway — GCP-managed API gateway Offer satisfying the abstract
 * ApiGateway. Inherits any vendor-neutral parameters, dependencies and links
 * from the abstract component. No vendor sub-components.
 */
export const GcpApiGateway: Offer = {
  type: GCP_API_GATEWAY_TYPE,
  provider: 'GCP',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, GCP_API_GATEWAY_TYPE, 'GCP'),
  ],
};
