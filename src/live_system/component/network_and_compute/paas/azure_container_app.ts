import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';

// Agent constant: AZURE_CONTAINER_APP_COMPONENT_NAME = "AzureContainerApp"
const AZURE_CONTAINER_APP_TYPE_NAME = 'AzureContainerApp';

// ── internal helpers ──────────────────────────────────────────────────────────

function buildAzureContainerAppType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_CONTAINER_APP_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Functional Offer (Fractal + Interface migration) ──────────────────────────

const AZURE_CONTAINER_APP_OFFER_TYPE = buildAzureContainerAppType();

/**
 * Azure Container App Offer satisfying the abstract `Workload`. Inherits the
 * vendor-neutral parameters (`image`, `port`, `replicas`, `env`), dependencies
 * and links. Location, resourceGroup and ingress/replica knobs are Azure-only
 * extras and are NOT on the neutral Interface.
 */
export const AzureContainerApp: Offer = {
  type: AZURE_CONTAINER_APP_OFFER_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_CONTAINER_APP_OFFER_TYPE, 'Azure'),
  ],
};
