import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const OBSERVABILITY_SAAS_UNMANAGED_TYPE_NAME = 'Unmanaged';

function buildObservabilitySaaSUnmanagedType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Observability)
    .withServiceDeliveryModel(ServiceDeliveryModel.SaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(OBSERVABILITY_SAAS_UNMANAGED_TYPE_NAME)
        .build(),
    )
    .build();
}

const OBSERVABILITY_SAAS_UNMANAGED_TYPE = buildObservabilitySaaSUnmanagedType();

/**
 * Unmanaged observability — a SaaS Offer satisfying the abstract
 * ObservabilityUnmanaged. It represents an externally owned observability stack
 * that Fractal Cloud does not provision. It inherits whatever vendor-neutral
 * parameters, dependencies and links the abstract component carries. No
 * vendor-only extras and no sub-components.
 */
export const ObservabilityUnmanaged: Offer = {
  type: OBSERVABILITY_SAAS_UNMANAGED_TYPE,
  provider: 'SaaS',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, OBSERVABILITY_SAAS_UNMANAGED_TYPE, 'SaaS'),
  ],
};
