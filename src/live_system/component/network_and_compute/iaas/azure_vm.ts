import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.AzureVm
const AZURE_VM_TYPE_NAME = 'AzureVm';

// Vendor-only parameter keys carried by this offer: vmSize, location,
// resourceGroup, adminUsername, imagePublisher, imageOffer, imageSku,
// sshPublicKey, osDiskSizeGb.

function buildAzureVmType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AZURE_VM_TYPE_NAME).build(),
    )
    .build();
}

const AZURE_VM_TYPE = buildAzureVmType();

/**
 * Azure Virtual Machine — Azure IaaS virtual machine Offer satisfying the
 * abstract VirtualMachine. Inherits all vendor-neutral parameters, dependencies
 * and links. No vendor sub-components.
 */
export const AzureVm: Offer = {
  type: AZURE_VM_TYPE,
  provider: 'Azure',
  instantiate: ctx => [instantiateFromNeutral(ctx, AZURE_VM_TYPE, 'Azure')],
};
