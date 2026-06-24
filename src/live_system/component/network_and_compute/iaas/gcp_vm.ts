import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.GceInstance
const GCE_INSTANCE_TYPE_NAME = 'GceInstance';

// Vendor-only parameter keys carried by this offer: machineType, zone,
// imageProject, imageFamily, serviceAccountEmail.

function buildGceInstanceType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(GCE_INSTANCE_TYPE_NAME).build(),
    )
    .build();
}

const GCE_INSTANCE_TYPE = buildGceInstanceType();

/**
 * Google Compute Engine instance — GCP IaaS virtual machine Offer satisfying the
 * abstract VirtualMachine. Inherits all vendor-neutral parameters, dependencies
 * and links. No vendor sub-components.
 */
export const GcpVm: Offer = {
  type: GCE_INSTANCE_TYPE,
  provider: 'GCP',
  instantiate: ctx => [instantiateFromNeutral(ctx, GCE_INSTANCE_TYPE, 'GCP')],
};
