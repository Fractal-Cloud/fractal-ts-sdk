import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const API_MANAGEMENT_SAAS_UNMANAGED_TYPE_NAME = 'Unmanaged';

function buildApiManagementSaaSUnmanagedType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
    .withServiceDeliveryModel(ServiceDeliveryModel.SaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(API_MANAGEMENT_SAAS_UNMANAGED_TYPE_NAME)
        .build(),
    )
    .build();
}

const API_MANAGEMENT_SAAS_UNMANAGED_TYPE =
  buildApiManagementSaaSUnmanagedType();

/**
 * Unmanaged API management — a SaaS Offer satisfying the abstract
 * ApiManagementUnmanaged. It represents an externally owned API management
 * endpoint that Fractal Cloud does not provision. It inherits whatever
 * vendor-neutral parameters, dependencies and links the abstract component
 * carries. No vendor-only extras and no sub-components.
 */
export const ApiManagementSaaSUnmanaged: Offer = {
  type: API_MANAGEMENT_SAAS_UNMANAGED_TYPE,
  provider: 'SaaS',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, API_MANAGEMENT_SAAS_UNMANAGED_TYPE, 'SaaS'),
  ],
};
