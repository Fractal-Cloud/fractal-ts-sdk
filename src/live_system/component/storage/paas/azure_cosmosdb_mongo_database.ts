import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: offer type Storage.PaaS.CosmosDbMongoDatabase
const AZURE_COSMOSDB_MONGO_DATABASE_TYPE_NAME = 'CosmosDbMongoDatabase';

function buildType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_COSMOSDB_MONGO_DATABASE_TYPE_NAME)
        .build(),
    )
    .build();
}

const AZURE_COSMOSDB_MONGO_DATABASE_TYPE = buildType();

/**
 * Azure Cosmos DB for MongoDB database — Azure-managed document database Offer
 * satisfying the abstract DocumentDatabase. Inherits the abstract component's
 * vendor-neutral parameters, dependencies and links. It exposes no vendor-only
 * extras, so it emits a single primary live component and no sub-components.
 */
export const AzureCosmosDbMongoDatabase: Offer = {
  type: AZURE_COSMOSDB_MONGO_DATABASE_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_COSMOSDB_MONGO_DATABASE_TYPE, 'Azure'),
  ],
};
