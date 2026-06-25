import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: Storage.PaaS.BigtableDbms
const GCP_BIGTABLE_DBMS_TYPE_NAME = 'BigtableDbms';

function buildGcpBigtableDbmsType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(GCP_BIGTABLE_DBMS_TYPE_NAME)
        .build(),
    )
    .build();
}

const GCP_BIGTABLE_DBMS_TYPE = buildGcpBigtableDbmsType();

/**
 * Google Cloud Bigtable — GCP-managed key-value DBMS Offer satisfying the abstract
 * KeyValueDbms. Inherits all vendor-neutral parameters, dependencies and links.
 * Vendor-only knobs (region, instanceType, storageType, clusterNodeCount, ...) are
 * offer-level extras and are not part of the neutral Interface.
 */
export const GcpBigtable: Offer = {
  type: GCP_BIGTABLE_DBMS_TYPE,
  provider: 'GCP',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, GCP_BIGTABLE_DBMS_TYPE, 'GCP'),
  ],
};
