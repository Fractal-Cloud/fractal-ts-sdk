import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.OciInstance
const OCI_INSTANCE_TYPE_NAME = 'OciInstance';

// Vendor-only parameter keys carried by this offer: compartmentId,
// availabilityDomain, shape, imageId, ocpus, memoryInGbs, sshPublicKey.

function buildOciInstanceType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(OCI_INSTANCE_TYPE_NAME).build(),
    )
    .build();
}

const OCI_INSTANCE_TYPE = buildOciInstanceType();

/**
 * Oracle Cloud Infrastructure Compute instance — OCI IaaS virtual machine Offer
 * satisfying the abstract VirtualMachine. Inherits all vendor-neutral
 * parameters, dependencies and links. No vendor sub-components.
 */
export const OciInstance: Offer = {
  type: OCI_INSTANCE_TYPE,
  provider: 'OCI',
  instantiate: ctx => [instantiateFromNeutral(ctx, OCI_INSTANCE_TYPE, 'OCI')],
};
