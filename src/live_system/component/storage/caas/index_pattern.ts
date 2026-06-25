import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer: Storage.CaaS.IndexPattern — defines an index pattern over a
// search backend (e.g. an OpenSearch/Elasticsearch index pattern) on a running
// Kubernetes cluster, satisfying the abstract SearchEntity blueprint.
const INDEX_PATTERN_TYPE_NAME = 'IndexPattern';

function buildIndexPatternType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(INDEX_PATTERN_TYPE_NAME).build(),
    )
    .build();
}

const INDEX_PATTERN_TYPE = buildIndexPatternType();

/**
 * Index Pattern — CaaS search-entity Offer satisfying the abstract SearchEntity.
 * Inherits the abstract component's vendor-neutral parameters, dependencies and
 * links. Vendor-only knobs (namespace, pattern, timeField, isDefault) are
 * offer-level extras and are not part of the neutral Interface.
 */
export const IndexPattern: Offer = {
  type: INDEX_PATTERN_TYPE,
  provider: 'CaaS',
  instantiate: ctx => [instantiateFromNeutral(ctx, INDEX_PATTERN_TYPE, 'CaaS')],
};
