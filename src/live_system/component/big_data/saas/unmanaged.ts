import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const BIG_DATA_SAAS_UNMANAGED_TYPE_NAME = 'Unmanaged';

function buildBigDataSaaSUnmanagedType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.SaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(BIG_DATA_SAAS_UNMANAGED_TYPE_NAME)
        .build(),
    )
    .build();
}

const BIG_DATA_SAAS_UNMANAGED_TYPE = buildBigDataSaaSUnmanagedType();

/**
 * BigData SaaS Unmanaged — Offer satisfying the abstract BigDataUnmanaged for an
 * external / pre-existing big-data system. Inherits the abstract component's
 * vendor-neutral parameters, dependencies and links. No vendor-only extras and no
 * sub-components.
 */
export const BigDataSaaSUnmanaged: Offer = {
  type: BIG_DATA_SAAS_UNMANAGED_TYPE,
  provider: 'SaaS',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, BIG_DATA_SAAS_UNMANAGED_TYPE, 'SaaS'),
  ],
};
