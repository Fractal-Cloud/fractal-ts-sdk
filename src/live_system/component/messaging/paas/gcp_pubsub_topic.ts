import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: PUBSUB_TOPIC_COMPONENT_NAME = "PubSubTopic"
const PUBSUB_TOPIC_TYPE_NAME = 'PubSubTopic';

function buildType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(PUBSUB_TOPIC_TYPE_NAME).build(),
    )
    .build();
}

const PUBSUB_TOPIC_TYPE = buildType();

/**
 * Google Cloud Pub/Sub Topic — GCP-managed messaging entity Offer satisfying the
 * abstract MessagingEntity. Inherits the vendor-neutral parameters set through
 * the Fractal Interface.
 */
export const GcpPubSubTopic: Offer = {
  type: PUBSUB_TOPIC_TYPE,
  provider: 'GCP',
  instantiate: ctx => [instantiateFromNeutral(ctx, PUBSUB_TOPIC_TYPE, 'GCP')],
};
