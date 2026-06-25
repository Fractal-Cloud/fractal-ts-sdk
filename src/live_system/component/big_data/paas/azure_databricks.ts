import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const AZURE_DATABRICKS_TYPE_NAME = 'Databricks';

function buildAzureDatabricksType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_DATABRICKS_TYPE_NAME)
        .build(),
    )
    .build();
}

const AZURE_DATABRICKS_TYPE = buildAzureDatabricksType();

/**
 * Azure Databricks — Azure-managed distributed data processing Offer satisfying
 * the abstract DistributedDataProcessing. Inherits the abstract component's
 * vendor-neutral parameters, dependencies and links. Vendor-only knobs
 * (`pricingTier`, `managedResourceGroupName`, `enableNoPublicIp`) are set at
 * reconcile time by the agent and are not part of the neutral Interface. No
 * sub-components.
 */
export const AzureDatabricks: Offer = {
  type: AZURE_DATABRICKS_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_DATABRICKS_TYPE, 'Azure'),
  ],
};
