import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.AzureSubnet
const AZURE_SUBNET_TYPE_NAME = 'AzureSubnet';

function buildAzureSubnetType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AZURE_SUBNET_TYPE_NAME).build(),
    )
    .build();
}

const AZURE_SUBNET_TYPE = buildAzureSubnetType();

/**
 * Azure Subnet — Azure-managed Offer satisfying the abstract Subnet. Inherits
 * the vendor-neutral `cidrBlock`; vendor-only knobs (e.g. resourceGroup) are not
 * part of the Interface and would be set on this offer directly if required.
 */
export const AzureSubnet: Offer = {
  type: AZURE_SUBNET_TYPE,
  provider: 'Azure',
  instantiate: ctx => [instantiateFromNeutral(ctx, AZURE_SUBNET_TYPE, 'Azure')],
};
