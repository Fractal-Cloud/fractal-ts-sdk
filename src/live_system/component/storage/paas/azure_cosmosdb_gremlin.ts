import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// BFF offer id: Storage.PaaS.CosmosDbGremlinDatabase
const AZURE_COSMOSDB_GREMLIN_TYPE_NAME = 'CosmosDbGremlinDatabase';

function buildAzureCosmosDbGremlinType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_COSMOSDB_GREMLIN_TYPE_NAME)
        .build(),
    )
    .build();
}

const AZURE_COSMOSDB_GREMLIN_TYPE = buildAzureCosmosDbGremlinType();

/**
 * Azure Cosmos DB (Gremlin API) — Azure-managed graph DBMS Offer satisfying the
 * abstract GraphDbms. Inherits the abstract component's vendor-neutral parameters,
 * dependencies and links. Vendor-only knobs (throughput mode, consistency level,
 * resource group) are offer-level extras and are not part of the neutral Interface.
 */
export const AzureCosmosDbGremlin: Offer = {
  type: AZURE_COSMOSDB_GREMLIN_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_COSMOSDB_GREMLIN_TYPE, 'Azure'),
  ],
};

/**
 * Azure Cosmos DB (Gremlin API) database — Azure-managed graph database Offer
 * satisfying the abstract GraphDatabase. Shares the Cosmos DB Gremlin catalog
 * type with {@link AzureCosmosDbGremlin}; it is exposed under its own const so the
 * GraphDatabase capability can carry it as a candidate offer. Inherits the
 * abstract component's vendor-neutral parameters, dependencies and links. Vendor-
 * only knobs (throughput mode, consistency level, resource group) are offer-level
 * extras and are not part of the neutral Interface.
 */
export const AzureCosmosDbGremlinDatabase: Offer = {
  type: AZURE_COSMOSDB_GREMLIN_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_COSMOSDB_GREMLIN_TYPE, 'Azure'),
  ],
};
