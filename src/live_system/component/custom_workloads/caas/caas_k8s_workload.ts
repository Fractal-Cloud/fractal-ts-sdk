import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';

// Agent constant: OfferWorkload = "CustomWorkloads.CaaS.K8sDeployment"
const CAAS_K8S_WORKLOAD_TYPE_NAME = 'K8sDeployment';

// ── internal helpers ──────────────────────────────────────────────────────────

function buildCaaSK8sWorkloadType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.CustomWorkloads)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(CAAS_K8S_WORKLOAD_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Functional Offer (Fractal + Interface migration) ──────────────────────────

const CAAS_K8S_WORKLOAD_OFFER_TYPE = buildCaaSK8sWorkloadType();

/**
 * Generic CaaS Kubernetes Workload Offer satisfying the abstract `Workload`.
 * Inherits the vendor-neutral parameters (`image`, `port`, `replicas`, `env`),
 * dependencies and links. The `manifestUri` (OCI `.fractal/` bundle URI), `cpu`
 * and `memory` knobs are CaaS-only extras and are NOT on the neutral Interface.
 */
export const CaaSK8sWorkload: Offer = {
  type: CAAS_K8S_WORKLOAD_OFFER_TYPE,
  provider: 'CaaS',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, CAAS_K8S_WORKLOAD_OFFER_TYPE, 'CaaS'),
  ],
};
