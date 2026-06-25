import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: KAFKA_COMPONENT_NAME = "Kafka" — offer type Messaging.CaaS.Kafka
const KAFKA_TYPE_NAME = 'Kafka';

function buildKafkaType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(PascalCaseString.getBuilder().withValue(KAFKA_TYPE_NAME).build())
    .build();
}

const KAFKA_TYPE = buildKafkaType();

/**
 * Kafka — CaaS message broker Offer satisfying the abstract CaaSBroker. Inherits
 * the abstract component's vendor-neutral parameters, dependencies and links.
 * Vendor-only knobs (namespace, clusterName) are offer-level extras and are not
 * part of the neutral Interface.
 */
export const Kafka: Offer = {
  type: KAFKA_TYPE,
  provider: 'CaaS',
  instantiate: ctx => [instantiateFromNeutral(ctx, KAFKA_TYPE, 'CaaS')],
};
