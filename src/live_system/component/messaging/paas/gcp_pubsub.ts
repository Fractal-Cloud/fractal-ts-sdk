import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: PUBSUB_COMPONENT_NAME = "PubSub"
const PUBSUB_TYPE_NAME = 'PubSub';

function buildGcpPubSubType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(PascalCaseString.getBuilder().withValue(PUBSUB_TYPE_NAME).build())
    .build();
}

const GCP_PUBSUB_TYPE = buildGcpPubSubType();

/**
 * Google Cloud Pub/Sub — GCP-managed message broker Offer satisfying the
 * abstract Broker. Inherits the vendor-neutral `azureRegion`,
 * `azureResourceGroup` and `sku` parameters declared by the dev (GCP ignores the
 * Azure-flavored ones at reconcile time). No vendor-only extras and no
 * sub-components.
 */
export const GcpPubSub: Offer = {
  type: GCP_PUBSUB_TYPE,
  provider: 'GCP',
  instantiate: ctx => [instantiateFromNeutral(ctx, GCP_PUBSUB_TYPE, 'GCP')],
};
