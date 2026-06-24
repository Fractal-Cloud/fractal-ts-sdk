import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.OpenshiftVirtualMachine
const OPENSHIFT_VM_TYPE_NAME = 'OpenshiftVirtualMachine';

// Vendor-only parameter keys carried by this offer: name, image, namespace,
// cpuCores, memorySizeGi, diskSizeGi, storageClassName, networkName,
// cloudInitUserData, sshPublicKey, runStrategy.

function buildOpenshiftVmType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(OPENSHIFT_VM_TYPE_NAME).build(),
    )
    .build();
}

const OPENSHIFT_VM_TYPE = buildOpenshiftVmType();

/**
 * Red Hat OpenShift Virtualization (KubeVirt) VM — RedHat IaaS virtual machine
 * Offer satisfying the abstract VirtualMachine. Inherits all vendor-neutral
 * parameters, dependencies and links. No vendor sub-components.
 */
export const OpenshiftVm: Offer = {
  type: OPENSHIFT_VM_TYPE,
  provider: 'RedHat',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, OPENSHIFT_VM_TYPE, 'RedHat'),
  ],
};
