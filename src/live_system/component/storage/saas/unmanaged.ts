import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: UNMANAGED_COMPONENT_NAME = "Unmanaged" — offer type Storage.SaaS.Unmanaged
const UNMANAGED_TYPE_NAME = 'Unmanaged';

function buildSaaSUnmanagedType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.SaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(UNMANAGED_TYPE_NAME).build(),
    )
    .build();
}

const SAAS_UNMANAGED_TYPE = buildSaaSUnmanagedType();

/**
 * SaaS Unmanaged — an external storage resource that Fractal references but does
 * not provision or reconcile. It is the SaaS Offer satisfying the abstract
 * Unmanaged capability. It carries no vendor-neutral parameters; its sole purpose
 * is to declare an external dependency in the live system.
 */
export const SaaSUnmanaged: Offer = {
  type: SAAS_UNMANAGED_TYPE,
  provider: 'SaaS',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, SAAS_UNMANAGED_TYPE, 'SaaS'),
  ],
};
