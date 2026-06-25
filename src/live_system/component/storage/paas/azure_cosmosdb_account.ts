import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: Storage.PaaS.CosmosDbAccount
const AZURE_COSMOSDB_ACCOUNT_TYPE_NAME = 'CosmosDbAccount';

function buildAzureCosmosDbAccountType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_COSMOSDB_ACCOUNT_TYPE_NAME)
        .build(),
    )
    .build();
}

const AZURE_COSMOSDB_ACCOUNT_TYPE = buildAzureCosmosDbAccountType();

/**
 * Azure Cosmos DB account — Azure-managed document DBMS Offer satisfying the
 * abstract DocumentDbms. Inherits all vendor-neutral parameters. Vendor-only
 * knobs (azureRegion, azureResourceGroup, maxTotalThroughput,
 * publicNetworkAccess) are offer-level extras and are not part of the neutral
 * Interface.
 */
export const AzureCosmosDbAccount: Offer = {
  type: AZURE_COSMOSDB_ACCOUNT_TYPE,
  provider: 'Azure',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, AZURE_COSMOSDB_ACCOUNT_TYPE, 'Azure'),
  ],
};
