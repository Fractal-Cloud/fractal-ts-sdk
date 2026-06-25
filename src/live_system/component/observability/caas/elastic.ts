import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const ELASTIC_TYPE_NAME = 'Elastic';

// Vendor-only knobs carried by this offer (inherited from the abstract
// component's neutral parameters at instantiate time). They are offer-only
// extras — not Fractal Interface ops — because only Elastic supports them.
export const NAMESPACE_PARAM = 'namespace';
export const ELASTIC_VERSION_PARAM = 'elasticVersion';
export const ELASTIC_INSTANCES_PARAM = 'elasticInstances';
export const STORAGE_PARAM = 'storage';
export const IS_APM_REQUIRED_PARAM = 'isApmRequired';
export const IS_KIBANA_REQUIRED_PARAM = 'isKibanaRequired';

function buildElasticType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Observability)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(ELASTIC_TYPE_NAME).build(),
    )
    .build();
}

const ELASTIC_TYPE = buildElasticType();

/**
 * Elastic — CaaS-managed logging stack (Elasticsearch + optional Kibana/APM)
 * Offer satisfying the abstract Logging capability. Inherits the abstract
 * component's vendor-neutral parameters, dependencies and links. Its
 * vendor-only extras (`namespace`, `elasticVersion`, `elasticInstances`,
 * `storage`, `isApmRequired`, `isKibanaRequired`) flow through as parameters.
 * No sub-components.
 */
export const ObservabilityElastic: Offer = {
  type: ELASTIC_TYPE,
  provider: 'CaaS',
  instantiate: ctx => [instantiateFromNeutral(ctx, ELASTIC_TYPE, 'CaaS')],
};
