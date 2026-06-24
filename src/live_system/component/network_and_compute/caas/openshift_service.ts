import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';

// Agent constant: OfferService = "NetworkAndCompute.CaaS.OpenshiftService"
const OPENSHIFT_SERVICE_TYPE_NAME = 'OpenshiftService';

// ── internal helpers ──────────────────────────────────────────────────────────

function buildOpenshiftServiceType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(OPENSHIFT_SERVICE_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Functional Offer (Fractal + Interface migration) ──────────────────────────

const OPENSHIFT_SERVICE_OFFER_TYPE = buildOpenshiftServiceType();

/**
 * OpenShift Service Offer satisfying the abstract `Workload`. Inherits the
 * vendor-neutral parameters (`image`, `port`, `replicas`, `env`), dependencies
 * and links. Route/namespace/service-type knobs are OpenShift-only extras and
 * are NOT on the neutral Interface.
 */
export const OpenshiftService: Offer = {
  type: OPENSHIFT_SERVICE_OFFER_TYPE,
  provider: 'RedHat',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, OPENSHIFT_SERVICE_OFFER_TYPE, 'RedHat'),
  ],
};
