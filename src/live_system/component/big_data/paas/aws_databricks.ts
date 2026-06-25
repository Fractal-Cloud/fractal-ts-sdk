import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const AWS_DATABRICKS_TYPE_NAME = 'Databricks';

function buildAwsDatabricksType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AWS_DATABRICKS_TYPE_NAME).build(),
    )
    .build();
}

const AWS_DATABRICKS_TYPE = buildAwsDatabricksType();

/**
 * AWS Databricks — AWS-managed distributed data processing Offer satisfying the
 * abstract DistributedDataProcessing. Inherits the abstract component's
 * vendor-neutral parameters, dependencies and links. Vendor-only knobs
 * (`pricingTier`, `credentialsId`, `storageConfigurationId`, `networkId`) are
 * set at reconcile time by the agent and are not part of the neutral Interface.
 * No sub-components.
 */
export const AwsDatabricks: Offer = {
  type: AWS_DATABRICKS_TYPE,
  provider: 'AWS',
  instantiate: ctx => [instantiateFromNeutral(ctx, AWS_DATABRICKS_TYPE, 'AWS')],
};
