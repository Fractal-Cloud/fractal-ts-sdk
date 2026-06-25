import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: SUBSCRIPTION_COMPONENT_NAME = "Subscription"
const SUBSCRIPTION_TYPE_NAME = 'Subscription';

function buildType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(SUBSCRIPTION_TYPE_NAME).build(),
    )
    .build();
}

const SUBSCRIPTION_TYPE = buildType();

/**
 * Google Cloud Pub/Sub Subscription — GCP-managed messaging entity Offer
 * satisfying the abstract MessagingEntity. Inherits the vendor-neutral
 * parameters set through the Fractal Interface.
 */
export const GcpPubSubSubscription: Offer = {
  type: SUBSCRIPTION_TYPE,
  provider: 'GCP',
  instantiate: ctx => [instantiateFromNeutral(ctx, SUBSCRIPTION_TYPE, 'GCP')],
};
