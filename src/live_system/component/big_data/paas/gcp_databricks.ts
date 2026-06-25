import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const GCP_DATABRICKS_TYPE_NAME = 'Databricks';

function buildGcpDatabricksType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(GCP_DATABRICKS_TYPE_NAME).build(),
    )
    .build();
}

const GCP_DATABRICKS_TYPE = buildGcpDatabricksType();

/**
 * GCP Databricks — GCP-managed distributed data processing Offer satisfying the
 * abstract DistributedDataProcessing. Inherits the abstract component's
 * vendor-neutral parameters, dependencies and links. Vendor-only knobs
 * (`pricingTier`, `networkId`) are set at reconcile time by the agent and are
 * not part of the neutral Interface. No sub-components.
 */
export const GcpDatabricks: Offer = {
  type: GCP_DATABRICKS_TYPE,
  provider: 'GCP',
  instantiate: ctx => [instantiateFromNeutral(ctx, GCP_DATABRICKS_TYPE, 'GCP')],
};
