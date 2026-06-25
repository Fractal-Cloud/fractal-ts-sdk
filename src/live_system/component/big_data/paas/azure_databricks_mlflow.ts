import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: BigData.PaaS.DatabricksMlflowExperiment
const AZURE_DATABRICKS_MLFLOW_TYPE_NAME = 'DatabricksMlflowExperiment';

function buildAzureDatabricksMlflowType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_DATABRICKS_MLFLOW_TYPE_NAME)
        .build(),
    )
    .build();
}

const AZURE_DATABRICKS_MLFLOW_TYPE = buildAzureDatabricksMlflowType();

/**
 * Azure Databricks MLflow — Azure-managed ML experiment tracker Offer satisfying
 * the abstract MlExperiment. Inherits the vendor-neutral `experimentName` and
 * `artifactLocation` parameters. No vendor-only extras and no sub-components.
 */
export const AzureDatabricksMlflow: Offer = {
  type: AZURE_DATABRICKS_MLFLOW_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_DATABRICKS_MLFLOW_TYPE, 'Azure'),
  ],
};
