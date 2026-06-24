import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';

// Agent constant: OfferWorkload = "CustomWorkloads.CaaS.OpenshiftWorkload"
const OPENSHIFT_WORKLOAD_TYPE_NAME = 'OpenshiftWorkload';

// ── internal helpers ──────────────────────────────────────────────────────────

function buildOpenshiftWorkloadType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.CustomWorkloads)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(OPENSHIFT_WORKLOAD_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Functional Offer (Fractal + Interface migration) ──────────────────────────

const OPENSHIFT_WORKLOAD_OFFER_TYPE = buildOpenshiftWorkloadType();

/**
 * OpenShift Workload Offer satisfying the abstract `Workload`. Inherits the
 * vendor-neutral parameters (`image`, `port`, `replicas`, `env`), dependencies
 * and links. The namespace / workloadType / cpuLimit / memoryLimit / protocol /
 * serviceAccountName / command / args / volumeMounts knobs are OpenShift-only
 * extras and are NOT on the neutral Interface.
 */
export const OpenshiftWorkload: Offer = {
  type: OPENSHIFT_WORKLOAD_OFFER_TYPE,
  provider: 'RedHat',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, OPENSHIFT_WORKLOAD_OFFER_TYPE, 'RedHat'),
  ],
};
