import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.VspherePortGroup
const VSPHERE_PORT_GROUP_TYPE_NAME = 'VspherePortGroup';

function buildVspherePortGroupType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(VSPHERE_PORT_GROUP_TYPE_NAME)
        .build(),
    )
    .build();
}

const VSPHERE_PORT_GROUP_TYPE = buildVspherePortGroupType();

/**
 * vSphere Port Group — VMware Offer satisfying the abstract Subnet. Inherits the
 * vendor-neutral `cidrBlock`; vendor-only knobs (e.g. name, dvSwitchName,
 * datacenter, vlanId, numPorts, portBinding) are not part of the Interface and
 * would be set on this offer directly if required.
 */
export const VspherePortGroup: Offer = {
  type: VSPHERE_PORT_GROUP_TYPE,
  provider: 'VMware',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, VSPHERE_PORT_GROUP_TYPE, 'VMware'),
  ],
};
