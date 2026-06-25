import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: DATABRICKS_CLUSTER_COMPONENT_NAME = "DatabricksCluster"
const GCP_DATABRICKS_CLUSTER_TYPE_NAME = 'DatabricksCluster';

function buildGcpDatabricksClusterType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(GCP_DATABRICKS_CLUSTER_TYPE_NAME)
        .build(),
    )
    .build();
}

const GCP_DATABRICKS_CLUSTER_TYPE = buildGcpDatabricksClusterType();

/**
 * GCP Databricks Cluster — GCP-managed Spark compute Offer satisfying the
 * abstract ComputeCluster. Inherits all vendor-neutral cluster parameters
 * (clusterName, sparkVersion, worker sizing, sparkConf, libraries, nodeTypeId,
 * dataSecurityMode, ...) from the abstract component. No vendor-only extras and
 * no sub-components.
 */
export const GcpDatabricksCluster: Offer = {
  type: GCP_DATABRICKS_CLUSTER_TYPE,
  provider: 'GCP',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, GCP_DATABRICKS_CLUSTER_TYPE, 'GCP'),
  ],
};
