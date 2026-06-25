import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const AZURE_SERVICE_BUS_TOPIC_TYPE_NAME = 'ServiceBusTopic';

function buildType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_SERVICE_BUS_TOPIC_TYPE_NAME)
        .build(),
    )
    .build();
}

const AZURE_SERVICE_BUS_TOPIC_TYPE = buildType();

/**
 * Azure Service Bus Topic — Azure-managed messaging entity Offer satisfying the
 * abstract MessagingEntity. Inherits the vendor-neutral parameters
 * (`messageRetentionHours`, `azureRegion`, `azureResourceGroup`) set through the
 * Fractal Interface.
 */
export const AzureServiceBusTopic: Offer = {
  type: AZURE_SERVICE_BUS_TOPIC_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_SERVICE_BUS_TOPIC_TYPE, 'Azure'),
  ],
};
