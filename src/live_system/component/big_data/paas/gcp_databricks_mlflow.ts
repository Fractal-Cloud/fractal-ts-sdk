import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: BigData.PaaS.DatabricksMlflowExperiment
const GCP_DATABRICKS_MLFLOW_TYPE_NAME = 'DatabricksMlflowExperiment';

function buildGcpDatabricksMlflowType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(GCP_DATABRICKS_MLFLOW_TYPE_NAME)
        .build(),
    )
    .build();
}

const GCP_DATABRICKS_MLFLOW_TYPE = buildGcpDatabricksMlflowType();

/**
 * GCP Databricks MLflow — GCP-managed ML experiment tracker Offer satisfying the
 * abstract MlExperiment. Inherits the vendor-neutral `experimentName` and
 * `artifactLocation` parameters. No vendor-only extras and no sub-components.
 */
export const GcpDatabricksMlflow: Offer = {
  type: GCP_DATABRICKS_MLFLOW_TYPE,
  provider: 'GCP',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, GCP_DATABRICKS_MLFLOW_TYPE, 'GCP'),
  ],
};
