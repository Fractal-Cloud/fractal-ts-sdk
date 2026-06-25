import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: Storage.PaaS.Firestore
const FIRESTORE_TYPE_NAME = 'Firestore';

function buildFirestoreType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(FIRESTORE_TYPE_NAME).build(),
    )
    .build();
}

const FIRESTORE_TYPE = buildFirestoreType();

/**
 * Google Cloud Firestore — GCP-managed document DBMS Offer satisfying the
 * abstract DocumentDbms. Inherits all vendor-neutral parameters; adds no
 * vendor-only knobs in v1.
 */
export const GcpFirestore: Offer = {
  type: FIRESTORE_TYPE,
  provider: 'GCP',
  instantiate: ctx => [instantiateFromNeutral(ctx, FIRESTORE_TYPE, 'GCP')],
};
