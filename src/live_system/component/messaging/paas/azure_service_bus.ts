import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const AZURE_SERVICE_BUS_TYPE_NAME = 'ServiceBus';

function buildAzureServiceBusType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_SERVICE_BUS_TYPE_NAME)
        .build(),
    )
    .build();
}

const AZURE_SERVICE_BUS_TYPE = buildAzureServiceBusType();

/**
 * Azure Service Bus — Azure-managed message broker Offer satisfying the abstract
 * Broker. Inherits the vendor-neutral `azureRegion`, `azureResourceGroup` and
 * `sku` parameters. No vendor-only extras and no sub-components.
 */
export const AzureServiceBus: Offer = {
  type: AZURE_SERVICE_BUS_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_SERVICE_BUS_TYPE, 'Azure'),
  ],
};
