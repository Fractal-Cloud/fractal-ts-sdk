import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: Storage.PaaS.FileStorage
const AZURE_FILE_STORAGE_TYPE_NAME = 'FileStorage';

function buildAzureFileStorageType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_FILE_STORAGE_TYPE_NAME)
        .build(),
    )
    .build();
}

const AZURE_FILE_STORAGE_TYPE = buildAzureFileStorageType();

/**
 * Azure File Storage — Azure-managed file share Offer satisfying the abstract
 * FilesAndBlobs. Inherits the vendor-neutral parameters (`azureRegion`,
 * `azureResourceGroup`, `accessTier`, ...). Vendor-only knobs (shareQuota) are
 * offer-level extras and are not part of the neutral Interface.
 */
export const AzureFileStorage: Offer = {
  type: AZURE_FILE_STORAGE_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_FILE_STORAGE_TYPE, 'Azure'),
  ],
};
