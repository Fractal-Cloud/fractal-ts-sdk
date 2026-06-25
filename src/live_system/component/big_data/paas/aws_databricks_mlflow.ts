import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: BigData.PaaS.DatabricksMlflowExperiment
const AWS_DATABRICKS_MLFLOW_TYPE_NAME = 'DatabricksMlflowExperiment';

function buildAwsDatabricksMlflowType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AWS_DATABRICKS_MLFLOW_TYPE_NAME)
        .build(),
    )
    .build();
}

const AWS_DATABRICKS_MLFLOW_TYPE = buildAwsDatabricksMlflowType();

/**
 * AWS Databricks MLflow — AWS-managed ML experiment tracker Offer satisfying the
 * abstract MlExperiment. Inherits the vendor-neutral `experimentName` and
 * `artifactLocation` parameters. No vendor-only extras and no sub-components.
 */
export const AwsDatabricksMlflow: Offer = {
  type: AWS_DATABRICKS_MLFLOW_TYPE,
  provider: 'AWS',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AWS_DATABRICKS_MLFLOW_TYPE, 'AWS'),
  ],
};
