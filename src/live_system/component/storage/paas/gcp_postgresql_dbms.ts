import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// BFF offer id: Storage.PaaS.PostgreSqlDbms (shared across providers)
const GCP_POSTGRESQL_DBMS_TYPE_NAME = 'PostgreSqlDbms';

function buildType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(GCP_POSTGRESQL_DBMS_TYPE_NAME)
        .build(),
    )
    .build();
}

const GCP_POSTGRESQL_DBMS_TYPE = buildType();

/**
 * GCP PostgreSQL DBMS — GCP-managed relational DBMS Offer satisfying the abstract
 * RelationalDbms. Inherits the vendor-neutral `version` and `flavorName`
 * parameters. Vendor-only knobs (region, tier, storageAutoResize) are
 * offer-level extras and are not part of the neutral Interface.
 */
export const GcpPostgreSqlDbms: Offer = {
  type: GCP_POSTGRESQL_DBMS_TYPE,
  provider: 'GCP',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, GCP_POSTGRESQL_DBMS_TYPE, 'GCP'),
  ],
};
