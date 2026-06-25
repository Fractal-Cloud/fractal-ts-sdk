import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer: Storage.CaaS.Elastic — provisions an Elasticsearch cluster on a
// running Kubernetes cluster (CaaS) and satisfies the abstract Search blueprint
// via the catalogue's service ancestry.
const ELASTIC_TYPE_NAME = 'Elastic';

function buildElasticType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(ELASTIC_TYPE_NAME).build(),
    )
    .build();
}

const ELASTIC_TYPE = buildElasticType();

/**
 * Elastic — CaaS Elasticsearch Offer satisfying the abstract Search. Inherits the
 * vendor-neutral `namespace` parameter. Vendor-only knobs (elasticVersion,
 * elasticInstances, storage) are offer-level extras and are not part of the
 * neutral Interface.
 */
export const Elastic: Offer = {
  type: ELASTIC_TYPE,
  provider: 'CaaS',
  instantiate: ctx => [instantiateFromNeutral(ctx, ELASTIC_TYPE, 'CaaS')],
};
