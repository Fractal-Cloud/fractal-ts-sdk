import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const AZURE_EVENTHUB_TYPE_NAME = 'EventHub';

function buildType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AZURE_EVENTHUB_TYPE_NAME).build(),
    )
    .build();
}

const AZURE_EVENTHUB_TYPE = buildType();

/**
 * Azure Event Hub — Azure-managed messaging entity Offer satisfying the abstract
 * MessagingEntity. Inherits the vendor-neutral parameters
 * (`messageRetentionHours`, `azureRegion`, `azureResourceGroup`) set through the
 * Fractal Interface. Vendor-only knobs (`partitionCount`,
 * `messageRetentionInDays`) are offer-level extras and are not part of the
 * neutral Interface.
 */
export const AzureEventHub: Offer = {
  type: AZURE_EVENTHUB_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_EVENTHUB_TYPE, 'Azure'),
  ],
};
