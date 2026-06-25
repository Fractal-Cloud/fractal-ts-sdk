import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: BigData.CaaS.SparkMlExperiment
const CAAS_MLFLOW_TYPE_NAME = 'SparkMlExperiment';

function buildCaaSMlflowType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(CAAS_MLFLOW_TYPE_NAME).build(),
    )
    .build();
}

const CAAS_MLFLOW_TYPE = buildCaaSMlflowType();

/**
 * CaaS MLflow — self-hosted (Spark-on-Kubernetes) ML experiment tracker Offer
 * satisfying the abstract MlExperiment. Inherits the vendor-neutral
 * `experimentName` and `artifactLocation` parameters.
 *
 * Vendor-only knobs (`namespace`, `trackingUri`, `artifactRoot`) are CaaS
 * specific: they are not part of the neutral MlExperiment Interface and are
 * meaningful only for this offer. They flow through whenever the author sets
 * them on the abstract component, but no other offer supports them.
 *
 * No sub-components.
 */
export const CaaSMlflow: Offer = {
  type: CAAS_MLFLOW_TYPE,
  provider: 'CaaS',
  instantiate: ctx => [instantiateFromNeutral(ctx, CAAS_MLFLOW_TYPE, 'CaaS')],
};
