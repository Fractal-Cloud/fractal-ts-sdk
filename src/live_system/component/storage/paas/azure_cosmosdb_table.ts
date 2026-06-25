import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: Storage.PaaS.CosmosDbTable
const AZURE_COSMOSDB_TABLE_TYPE_NAME = 'CosmosDbTable';

function buildAzureCosmosDbTableType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_COSMOSDB_TABLE_TYPE_NAME)
        .build(),
    )
    .build();
}

const AZURE_COSMOSDB_TABLE_TYPE = buildAzureCosmosDbTableType();

/**
 * Azure Cosmos DB Table — Azure-managed key-value table Offer satisfying the
 * abstract KeyValueEntity. Inherits all vendor-neutral parameters, dependencies
 * and links; adds no vendor-only knobs in v1.
 */
export const AzureCosmosDbTable: Offer = {
  type: AZURE_COSMOSDB_TABLE_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_COSMOSDB_TABLE_TYPE, 'Azure'),
  ],
};
