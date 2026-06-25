import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: Storage.PaaS.StorageAccount
const AZURE_STORAGE_ACCOUNT_TYPE_NAME = 'StorageAccount';

function buildAzureStorageAccountType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_STORAGE_ACCOUNT_TYPE_NAME)
        .build(),
    )
    .build();
}

const AZURE_STORAGE_ACCOUNT_TYPE = buildAzureStorageAccountType();

/**
 * Azure Storage Account — Azure-managed object/blob/file store Offer satisfying
 * the abstract FilesAndBlobs. Inherits the vendor-neutral parameters
 * (`azureRegion`, `azureResourceGroup`, `accessTier`, ...). Vendor-only knobs
 * (kind, sku) are offer-level extras and are not part of the neutral Interface.
 */
export const AzureStorageAccount: Offer = {
  type: AZURE_STORAGE_ACCOUNT_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_STORAGE_ACCOUNT_TYPE, 'Azure'),
  ],
};
