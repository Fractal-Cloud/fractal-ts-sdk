import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Matches aria-agent-aruba handlers/block_storage.go: Storage.IaaS.ArubaBlockStorage
const ARUBA_BLOCK_STORAGE_TYPE_NAME = 'ArubaBlockStorage';

function buildArubaBlockStorageType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_BLOCK_STORAGE_TYPE_NAME)
        .build(),
    )
    .build();
}

const ARUBA_BLOCK_STORAGE_TYPE = buildArubaBlockStorageType();

/**
 * Aruba Block Storage — Aruba-managed block storage volume Offer satisfying the
 * abstract BlockStorage. Inherits all vendor-neutral parameters. The vendor-only
 * knobs `sizeGb` and `type` are offer-level extras (no second offer shares them)
 * and are set on the abstract component via `component.set(...)`, flowing through
 * `instantiateFromNeutral`.
 */
export const ArubaBlockStorage: Offer = {
  type: ARUBA_BLOCK_STORAGE_TYPE,
  provider: 'Aruba',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, ARUBA_BLOCK_STORAGE_TYPE, 'Aruba'),
  ],
};
