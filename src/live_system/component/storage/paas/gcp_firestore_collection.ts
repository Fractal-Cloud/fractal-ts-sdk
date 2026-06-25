import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: COLLECTION_COMPONENT_NAME = "Collection" — offer type Storage.PaaS.Collection
const COLLECTION_TYPE_NAME = 'Collection';

function buildType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(COLLECTION_TYPE_NAME).build(),
    )
    .build();
}

const COLLECTION_TYPE = buildType();

/**
 * Google Cloud Firestore collection — GCP-managed document database Offer
 * satisfying the abstract DocumentDatabase. Inherits the abstract component's
 * vendor-neutral parameters, dependencies and links. It exposes no vendor-only
 * extras, so it emits a single primary live component and no sub-components.
 */
export const GcpFirestoreCollection: Offer = {
  type: COLLECTION_TYPE,
  provider: 'GCP',
  instantiate: ctx => [instantiateFromNeutral(ctx, COLLECTION_TYPE, 'GCP')],
};
