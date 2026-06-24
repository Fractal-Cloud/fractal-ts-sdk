import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.PaaS.ArubaKaaS
const ARUBA_KAAS_TYPE_NAME = 'ArubaKaaS';

function buildArubaKaaSType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(ARUBA_KAAS_TYPE_NAME).build(),
    )
    .build();
}

const ARUBA_KAAS_TYPE = buildArubaKaaSType();

/**
 * Aruba KaaS — Aruba-managed Kubernetes Offer satisfying the abstract
 * ContainerPlatform. Inherits the vendor-neutral `nodePools` Interface op.
 *
 * Vendor-only knobs (single-offer, NOT on the neutral Interface; set on this
 * offer's own config when needed): kubernetesVersion, ha, nodePoolFlavor,
 * nodePoolCount, location.
 */
export const ArubaKaaS: Offer = {
  type: ARUBA_KAAS_TYPE,
  provider: 'Aruba',
  instantiate: ctx => [instantiateFromNeutral(ctx, ARUBA_KAAS_TYPE, 'Aruba')],
};
