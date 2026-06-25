import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// BFF offer id: Storage.PaaS.PostgreSqlDatabase
const GCP_POSTGRESQL_DATABASE_TYPE_NAME = 'PostgreSqlDatabase';

function buildType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(GCP_POSTGRESQL_DATABASE_TYPE_NAME)
        .build(),
    )
    .build();
}

const GCP_POSTGRESQL_DATABASE_TYPE = buildType();

/**
 * Cloud SQL for PostgreSQL — GCP-managed relational database Offer satisfying
 * the abstract RelationalDatabase. Inherits the vendor-neutral `collation` and
 * `charset` parameters; adds no vendor-only knobs in v1.
 */
export const GcpPostgreSqlDatabase: Offer = {
  type: GCP_POSTGRESQL_DATABASE_TYPE,
  provider: 'GCP',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, GCP_POSTGRESQL_DATABASE_TYPE, 'GCP'),
  ],
};
