import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';

// Agent constant: AZURE_CONTAINER_APPS_ENVIRONMENT_COMPONENT_NAME = "AzureContainerAppsEnvironment"
const AZURE_CONTAINER_APPS_ENV_TYPE_NAME = 'AzureContainerAppsEnvironment';

// ── internal helpers ──────────────────────────────────────────────────────────

function buildAzureContainerAppsEnvType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_CONTAINER_APPS_ENV_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Functional Offer (Fractal + Interface migration) ──────────────────────────

const AZURE_CONTAINER_APPS_ENV_OFFER_TYPE = buildAzureContainerAppsEnvType();

/**
 * Azure Container Apps Environment Offer satisfying the abstract `Workload`.
 * Inherits the vendor-neutral parameters, dependencies and links. Location,
 * resourceGroup and Log Analytics knobs are Azure-only extras and are NOT on the
 * neutral Interface.
 */
export const AzureContainerAppsEnvironment: Offer = {
  type: AZURE_CONTAINER_APPS_ENV_OFFER_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_CONTAINER_APPS_ENV_OFFER_TYPE, 'Azure'),
  ],
};
