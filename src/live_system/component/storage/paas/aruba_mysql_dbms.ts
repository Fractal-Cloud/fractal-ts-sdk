import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Matches aria-agent-aruba handlers/dbaas.go: Storage.PaaS.ArubaMySqlDbms
const ARUBA_MYSQL_DBMS_TYPE_NAME = 'ArubaMySqlDbms';

function buildType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_MYSQL_DBMS_TYPE_NAME)
        .build(),
    )
    .build();
}

const ARUBA_MYSQL_DBMS_TYPE = buildType();

/**
 * Aruba MySQL DBMS — Aruba-managed relational DBMS Offer satisfying the abstract
 * RelationalDbms. Inherits the vendor-neutral `version` and `flavorName`
 * parameters. It has no vendor-only extras.
 */
export const ArubaMySqlDbms: Offer = {
  type: ARUBA_MYSQL_DBMS_TYPE,
  provider: 'Aruba',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, ARUBA_MYSQL_DBMS_TYPE, 'Aruba'),
  ],
};
