import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';

// Agent constant: OCI_CONTAINER_INSTANCE_COMPONENT_NAME = "OciContainerInstance"
const OCI_CONTAINER_INSTANCE_TYPE_NAME = 'OciContainerInstance';

// ── internal helpers ──────────────────────────────────────────────────────────

function buildOciContainerInstanceType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(OCI_CONTAINER_INSTANCE_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Functional Offer (Fractal + Interface migration) ──────────────────────────

const OCI_CONTAINER_INSTANCE_OFFER_TYPE = buildOciContainerInstanceType();

/**
 * OCI Container Instance Offer satisfying the abstract `Workload`. Inherits the
 * vendor-neutral parameters (`image`, `port`, `replicas`, `env`), dependencies
 * and links. availabilityDomain, compartmentId, shape and OCPU/memory knobs are
 * OCI-only extras and are NOT on the neutral Interface.
 */
export const OciContainerInstance: Offer = {
  type: OCI_CONTAINER_INSTANCE_OFFER_TYPE,
  provider: 'OCI',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, OCI_CONTAINER_INSTANCE_OFFER_TYPE, 'OCI'),
  ],
};
