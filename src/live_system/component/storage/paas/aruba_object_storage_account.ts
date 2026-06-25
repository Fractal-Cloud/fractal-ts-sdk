import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Matches aria-agent-aruba handlers/object_storage.go: Storage.PaaS.ArubaObjectStorageAccount
const ARUBA_OBJECT_STORAGE_ACCOUNT_TYPE_NAME = 'ArubaObjectStorageAccount';

function buildArubaObjectStorageAccountType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_OBJECT_STORAGE_ACCOUNT_TYPE_NAME)
        .build(),
    )
    .build();
}

const ARUBA_OBJECT_STORAGE_ACCOUNT_TYPE = buildArubaObjectStorageAccountType();

/**
 * Aruba Object Storage Account — Aruba-managed S3-compatible object store Offer
 * satisfying the abstract FilesAndBlobs. Inherits the vendor-neutral parameters
 * (`accessTier`, `versioningEnabled`, `storageClass`, ...). Vendor-only knobs
 * (accountName, password, regionCode) are offer-level extras and are not part of
 * the neutral Interface.
 */
export const ArubaObjectStorageAccount: Offer = {
  type: ARUBA_OBJECT_STORAGE_ACCOUNT_TYPE,
  provider: 'Aruba',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, ARUBA_OBJECT_STORAGE_ACCOUNT_TYPE, 'Aruba'),
  ],
};
