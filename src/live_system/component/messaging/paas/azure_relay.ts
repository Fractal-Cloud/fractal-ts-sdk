import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const AZURE_RELAY_TYPE_NAME = 'Relay';

function buildAzureRelayType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AZURE_RELAY_TYPE_NAME).build(),
    )
    .build();
}

const AZURE_RELAY_TYPE = buildAzureRelayType();

/**
 * Azure Relay — Azure-managed hybrid connectivity Offer satisfying the abstract
 * Broker. Inherits the vendor-neutral `azureRegion`, `azureResourceGroup` and
 * `sku` parameters. No vendor-only extras and no sub-components.
 */
export const AzureRelay: Offer = {
  type: AZURE_RELAY_TYPE,
  provider: 'Azure',
  instantiate: ctx => [instantiateFromNeutral(ctx, AZURE_RELAY_TYPE, 'Azure')],
};
