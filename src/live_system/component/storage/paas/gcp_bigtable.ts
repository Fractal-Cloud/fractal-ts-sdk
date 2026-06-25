import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer id: Storage.PaaS.BigTable — BIGTABLE_COMPONENT_NAME = "BigTable"
const BIGTABLE_TYPE_NAME = 'BigTable';

function buildGcpBigTableType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(BIGTABLE_TYPE_NAME).build(),
    )
    .build();
}

const GCP_BIGTABLE_TYPE = buildGcpBigTableType();

/**
 * Google Cloud Bigtable — GCP-managed column-oriented DBMS Offer satisfying the
 * abstract ColumnOrientedDbms. Inherits all vendor-neutral parameters.
 * Vendor-only knobs (region, instanceType, storageType, clusterNodeCount,
 * replicationEnabled) are offer-level extras and are not part of the neutral
 * Interface.
 */
export const GcpBigTable: Offer = {
  type: GCP_BIGTABLE_TYPE,
  provider: 'GCP',
  instantiate: ctx => [instantiateFromNeutral(ctx, GCP_BIGTABLE_TYPE, 'GCP')],
};
