import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const AZURE_DATALAKE_TYPE_NAME = 'StorageAccount';

function buildAzureDatalakeType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AZURE_DATALAKE_TYPE_NAME).build(),
    )
    .build();
}

const AZURE_DATALAKE_TYPE = buildAzureDatalakeType();

/**
 * Azure Storage Account — Azure-managed ADLS Gen2 Offer satisfying the abstract
 * Datalake. Inherits all vendor-neutral parameters, dependencies and links from
 * the abstract component. Its vendor-only extras (`azureRegion`,
 * `azureResourceGroup`) are set on the offer's own parameters; no sub-components.
 */
export const AzureDatalake: Offer = {
  type: AZURE_DATALAKE_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_DATALAKE_TYPE, 'Azure'),
  ],
};
