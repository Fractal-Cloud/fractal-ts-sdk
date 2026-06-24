import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.VsphereVm
const VSPHERE_VM_TYPE_NAME = 'VsphereVm';

// Vendor-only parameter keys carried by this offer: template, datacenter,
// cluster, datastore, folder, numCpus, memoryMb, diskSizeGb, guestId, hostname,
// sshPublicKey, cloudInitUserData, storagePolicy, resourcePool.

function buildVsphereVmType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(VSPHERE_VM_TYPE_NAME).build(),
    )
    .build();
}

const VSPHERE_VM_TYPE = buildVsphereVmType();

/**
 * VMware vSphere Virtual Machine — VMware IaaS virtual machine Offer satisfying
 * the abstract VirtualMachine. Inherits all vendor-neutral parameters,
 * dependencies and links. No vendor sub-components.
 */
export const VsphereVm: Offer = {
  type: VSPHERE_VM_TYPE,
  provider: 'VMware',
  instantiate: ctx => [instantiateFromNeutral(ctx, VSPHERE_VM_TYPE, 'VMware')],
};
