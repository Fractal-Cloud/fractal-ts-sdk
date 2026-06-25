import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer id: Storage.PaaS.CosmosDbCassandra
const AZURE_COSMOSDB_CASSANDRA_TYPE_NAME = 'CosmosDbCassandra';

function buildAzureCosmosDbCassandraType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_COSMOSDB_CASSANDRA_TYPE_NAME)
        .build(),
    )
    .build();
}

const AZURE_COSMOSDB_CASSANDRA_TYPE = buildAzureCosmosDbCassandraType();

/**
 * Azure Cosmos DB for Apache Cassandra — Azure-managed column-oriented DBMS
 * Offer satisfying the abstract ColumnOrientedDbms. Inherits all vendor-neutral
 * parameters. Vendor-only knobs (azureRegion, azureResourceGroup,
 * cassandraVersion, hoursBetweenBackups) are offer-level extras and are not part
 * of the neutral Interface.
 */
export const AzureCosmosDbCassandra: Offer = {
  type: AZURE_COSMOSDB_CASSANDRA_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_COSMOSDB_CASSANDRA_TYPE, 'Azure'),
  ],
};
