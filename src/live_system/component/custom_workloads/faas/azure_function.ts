import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';

// Agent constant: Offer type = "CustomWorkloads.FaaS.AzureFunction"
const AZURE_FUNCTION_TYPE_NAME = 'AzureFunction';

// ── internal helpers ──────────────────────────────────────────────────────────

function buildAzureFunctionType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.CustomWorkloads)
    .withServiceDeliveryModel(ServiceDeliveryModel.FaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AZURE_FUNCTION_TYPE_NAME).build(),
    )
    .build();
}

// ── Functional Offer (Fractal + Interface migration) ──────────────────────────

const AZURE_FUNCTION_OFFER_TYPE = buildAzureFunctionType();

/**
 * Azure Function Offer satisfying the abstract `Function`. Inherits the
 * vendor-neutral parameters (`sourceArtifact`, `packageType`, `runtime`,
 * `environment`), dependencies and links. The Azure-only extras
 * (`storageAccountConnectionString`, `appSettings`, `configuration`, `identity`,
 * `appServicePlan`) are NOT on the neutral Interface.
 */
export const AzureFunction: Offer = {
  type: AZURE_FUNCTION_OFFER_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_FUNCTION_OFFER_TYPE, 'Azure'),
  ],
};
