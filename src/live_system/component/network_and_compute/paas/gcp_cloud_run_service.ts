import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';

// BFF offer id: NetworkAndCompute.CaaS.CloudRunService
const CLOUD_RUN_SERVICE_TYPE_NAME = 'CloudRunService';

// ── internal helpers ──────────────────────────────────────────────────────────

function buildGcpCloudRunServiceType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(CLOUD_RUN_SERVICE_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Functional Offer (Fractal + Interface migration) ──────────────────────────

const CLOUD_RUN_OFFER_TYPE = buildGcpCloudRunServiceType();

/**
 * GCP Cloud Run Service Offer satisfying the abstract `Workload`. Inherits the
 * vendor-neutral parameters (`image`, `port`, `replicas`, `env`), dependencies
 * and links. Region and the autoscaling/ingress knobs are GCP-only extras and
 * are NOT on the neutral Interface.
 */
export const CloudRun: Offer = {
  type: CLOUD_RUN_OFFER_TYPE,
  provider: 'GCP',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, CLOUD_RUN_OFFER_TYPE, 'GCP'),
  ],
};
