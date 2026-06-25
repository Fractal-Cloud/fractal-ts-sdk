import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: Storage.PaaS.CosmosDb
const AZURE_COSMOSDB_TYPE_NAME = 'CosmosDb';

function buildAzureCosmosDbType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AZURE_COSMOSDB_TYPE_NAME).build(),
    )
    .build();
}

const AZURE_COSMOSDB_TYPE = buildAzureCosmosDbType();

/**
 * Azure Cosmos DB (Table API) — Azure-managed key-value DBMS Offer satisfying the
 * abstract KeyValueDbms. Inherits all vendor-neutral parameters, dependencies and
 * links. Vendor-only knobs (azureRegion, azureResourceGroup, maxTotalThroughput,
 * ...) are offer-level extras and are not part of the neutral Interface.
 */
export const AzureCosmosDb: Offer = {
  type: AZURE_COSMOSDB_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_COSMOSDB_TYPE, 'Azure'),
  ],
};
