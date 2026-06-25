import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const AZURE_SERVICE_BUS_QUEUE_TYPE_NAME = 'ServiceBusQueue';

function buildType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_SERVICE_BUS_QUEUE_TYPE_NAME)
        .build(),
    )
    .build();
}

const AZURE_SERVICE_BUS_QUEUE_TYPE = buildType();

/**
 * Azure Service Bus Queue — Azure-managed messaging entity Offer satisfying the
 * abstract MessagingEntity. Inherits the vendor-neutral parameters
 * (`messageRetentionHours`, `azureRegion`, `azureResourceGroup`) set through the
 * Fractal Interface.
 */
export const AzureServiceBusQueue: Offer = {
  type: AZURE_SERVICE_BUS_QUEUE_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_SERVICE_BUS_QUEUE_TYPE, 'Azure'),
  ],
};
