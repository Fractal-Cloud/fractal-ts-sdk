import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const CAAS_SPARK_CLUSTER_TYPE_NAME = 'SparkCluster';

function buildCaaSSparkClusterType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(CAAS_SPARK_CLUSTER_TYPE_NAME)
        .build(),
    )
    .build();
}

const CAAS_SPARK_CLUSTER_TYPE = buildCaaSSparkClusterType();

/**
 * CaaS Spark Cluster — Kubernetes-hosted Spark compute Offer satisfying the
 * abstract ComputeCluster. Inherits all vendor-neutral cluster parameters from
 * the abstract component.
 *
 * Vendor-only knobs (`driverCores`, `driverMemory`, `executorCores`,
 * `executorMemory`, `executorInstances`) are specific to this Spark-on-K8s
 * offer; only one candidate offer supports them, so they are NOT promoted to
 * the Fractal Interface and are not set as neutral parameters. No sub-components.
 */
export const CaaSSparkCluster: Offer = {
  type: CAAS_SPARK_CLUSTER_TYPE,
  provider: 'CaaS',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, CAAS_SPARK_CLUSTER_TYPE, 'CaaS'),
  ],
};
