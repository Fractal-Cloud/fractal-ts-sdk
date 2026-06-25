import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: DATABRICKS_JOB_COMPONENT_NAME = "DatabricksJob"
const AWS_DATABRICKS_JOB_TYPE_NAME = 'DatabricksJob';

function buildAwsDatabricksJobType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AWS_DATABRICKS_JOB_TYPE_NAME)
        .build(),
    )
    .build();
}

const AWS_DATABRICKS_JOB_TYPE = buildAwsDatabricksJobType();

/**
 * AWS Databricks Job — AWS-managed Databricks job Offer satisfying the abstract
 * DataProcessingJob. Inherits every vendor-neutral parameter, dependency and
 * link from the abstract component. No vendor-only extras and no sub-components.
 */
export const AwsDatabricksJob: Offer = {
  type: AWS_DATABRICKS_JOB_TYPE,
  provider: 'AWS',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AWS_DATABRICKS_JOB_TYPE, 'AWS'),
  ],
};
