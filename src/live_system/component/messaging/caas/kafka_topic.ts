import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: KAFKA_TOPIC_COMPONENT_NAME = "KafkaTopic" — offer type
// Messaging.CaaS.KafkaTopic
const KAFKA_TOPIC_TYPE_NAME = 'KafkaTopic';

function buildKafkaTopicType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(KAFKA_TOPIC_TYPE_NAME).build(),
    )
    .build();
}

const KAFKA_TOPIC_TYPE = buildKafkaTopicType();

/**
 * Kafka Topic — self-managed (CaaS) Kafka topic Offer satisfying the abstract
 * CaaSMessagingEntity. It inherits the abstract component's vendor-neutral
 * parameters, dependencies and links. The vendor-only knob `namespace` is an
 * offer-level extra and is not part of the neutral Interface. There are no
 * vendor sub-components for this offer.
 */
export const KafkaTopic: Offer = {
  type: KAFKA_TOPIC_TYPE,
  provider: 'CaaS',
  instantiate: ctx => [instantiateFromNeutral(ctx, KAFKA_TOPIC_TYPE, 'CaaS')],
};
