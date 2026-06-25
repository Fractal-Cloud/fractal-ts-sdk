import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: SPARK_JOB_COMPONENT_NAME = "SparkJob"
const CAAS_SPARK_JOB_TYPE_NAME = 'SparkJob';

// Vendor-only knobs this offer additionally understands (Spark-on-Kubernetes
// specifics). They are not part of the neutral DataProcessingJob Interface; when
// the infra team sets them they flow through as neutral params and only this
// offer interprets them.
export const SCHEDULE_PARAM = 'schedule';
export const MAIN_CLASS_PARAM = 'mainClass';

function buildCaaSSparkJobType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(CAAS_SPARK_JOB_TYPE_NAME).build(),
    )
    .build();
}

const CAAS_SPARK_JOB_TYPE = buildCaaSSparkJobType();

/**
 * CaaS Spark Job — Spark-on-Kubernetes job Offer (SparkApplication CR) satisfying
 * the abstract DataProcessingJob. Inherits every vendor-neutral parameter,
 * dependency and link from the abstract component. It additionally recognizes the
 * vendor-only `schedule` and `mainClass` knobs (Spark-on-Kubernetes specifics)
 * when present in the neutral params. No sub-components.
 */
export const CaaSSparkJob: Offer = {
  type: CAAS_SPARK_JOB_TYPE,
  provider: 'CaaS',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, CAAS_SPARK_JOB_TYPE, 'CaaS'),
  ],
};
