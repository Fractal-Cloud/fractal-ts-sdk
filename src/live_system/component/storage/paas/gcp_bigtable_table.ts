import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: Storage.PaaS.BigTableTable
const BIGTABLE_TABLE_TYPE_NAME = 'BigTableTable';

function buildBigTableTableType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(BIGTABLE_TABLE_TYPE_NAME).build(),
    )
    .build();
}

const BIGTABLE_TABLE_TYPE = buildBigTableTableType();

/**
 * Google Cloud Bigtable table — GCP-managed column-oriented entity Offer
 * satisfying the abstract ColumnOrientedEntity. Inherits the abstract
 * component's vendor-neutral parameters, dependencies and links. Vendor-only
 * knobs (tableId, columnFamilies, splitKeys) ride through as parameters; they
 * are offer-level extras, not part of the neutral Interface.
 */
export const GcpBigTableTable: Offer = {
  type: BIGTABLE_TABLE_TYPE,
  provider: 'GCP',
  instantiate: ctx => [instantiateFromNeutral(ctx, BIGTABLE_TABLE_TYPE, 'GCP')],
};
