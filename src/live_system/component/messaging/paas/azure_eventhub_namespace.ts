import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const AZURE_EVENTHUB_NAMESPACE_TYPE_NAME = 'EventHubNamespace';

function buildAzureEventHubNamespaceType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_EVENTHUB_NAMESPACE_TYPE_NAME)
        .build(),
    )
    .build();
}

const AZURE_EVENTHUB_NAMESPACE_TYPE = buildAzureEventHubNamespaceType();

/**
 * Azure Event Hub Namespace — Azure-managed event streaming Offer satisfying the
 * abstract Broker. Inherits the vendor-neutral `azureRegion`,
 * `azureResourceGroup` and `sku` parameters.
 *
 * Vendor-only knobs (kafkaEnabled, autoInflateEnabled, maximumThroughputUnits,
 * minimumTlsVersion, publicNetworkAccess, skuName, skuTier, skuCapacity,
 * zoneRedundant) are offer-level extras supported only by this offer; they are
 * not part of the neutral Broker Interface. No sub-components.
 */
export const AzureEventHubNamespace: Offer = {
  type: AZURE_EVENTHUB_NAMESPACE_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_EVENTHUB_NAMESPACE_TYPE, 'Azure'),
  ],
};
