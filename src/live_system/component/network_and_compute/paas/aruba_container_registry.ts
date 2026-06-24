import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.PaaS.ArubaContainerRegistry
// Matches aria-agent-aruba handlers/container_registry.go.
const ARUBA_CONTAINER_REGISTRY_TYPE_NAME = 'ArubaContainerRegistry';

function buildArubaContainerRegistryType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_CONTAINER_REGISTRY_TYPE_NAME)
        .build(),
    )
    .build();
}

const ARUBA_CONTAINER_REGISTRY_TYPE = buildArubaContainerRegistryType();

/**
 * Aruba Container Registry — Aruba-managed container image registry Offer
 * satisfying the abstract ContainerRegistry. Inherits all vendor-neutral
 * parameters (e.g. `size`); adds no vendor-only knobs and no sub-components.
 */
export const ArubaContainerRegistry: Offer = {
  type: ARUBA_CONTAINER_REGISTRY_TYPE,
  provider: 'Aruba',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, ARUBA_CONTAINER_REGISTRY_TYPE, 'Aruba'),
  ],
};
