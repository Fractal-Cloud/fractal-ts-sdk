import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';

// Agent constant: Offer type = "CustomWorkloads.FaaS.GoogleFunction"
const GOOGLE_FUNCTION_TYPE_NAME = 'GoogleFunction';

// ── internal helpers ──────────────────────────────────────────────────────────

function buildGoogleFunctionType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.CustomWorkloads)
    .withServiceDeliveryModel(ServiceDeliveryModel.FaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(GOOGLE_FUNCTION_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Functional Offer (Fractal + Interface migration) ──────────────────────────

const GOOGLE_FUNCTION_OFFER_TYPE = buildGoogleFunctionType();

/**
 * GCP Google Function Offer satisfying the abstract `Function`. Inherits the
 * vendor-neutral parameters (`sourceArtifact`, `packageType`, `runtime`,
 * `environment`), dependencies and links. The GCP-only extras (`location`,
 * `entryPoint`) are NOT on the neutral Interface.
 */
export const GoogleFunction: Offer = {
  type: GOOGLE_FUNCTION_OFFER_TYPE,
  provider: 'GCP',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, GOOGLE_FUNCTION_OFFER_TYPE, 'GCP'),
  ],
};
