import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: DATABRICKS_CLUSTER_COMPONENT_NAME = "DatabricksCluster"
const AWS_DATABRICKS_CLUSTER_TYPE_NAME = 'DatabricksCluster';

function buildAwsDatabricksClusterType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AWS_DATABRICKS_CLUSTER_TYPE_NAME)
        .build(),
    )
    .build();
}

const AWS_DATABRICKS_CLUSTER_TYPE = buildAwsDatabricksClusterType();

/**
 * AWS Databricks Cluster — AWS-managed Spark compute Offer satisfying the
 * abstract ComputeCluster. Inherits all vendor-neutral cluster parameters
 * (clusterName, sparkVersion, worker sizing, sparkConf, libraries, nodeTypeId,
 * dataSecurityMode, ...) from the abstract component. No vendor-only extras and
 * no sub-components.
 */
export const AwsDatabricksCluster: Offer = {
  type: AWS_DATABRICKS_CLUSTER_TYPE,
  provider: 'AWS',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AWS_DATABRICKS_CLUSTER_TYPE, 'AWS'),
  ],
};
