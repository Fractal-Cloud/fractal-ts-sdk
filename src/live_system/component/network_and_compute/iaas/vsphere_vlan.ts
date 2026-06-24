import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.VsphereVlan
const VSPHERE_VLAN_TYPE_NAME = 'VsphereVlan';

function buildVsphereVlanType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(VSPHERE_VLAN_TYPE_NAME).build(),
    )
    .build();
}

const VSPHERE_VLAN_TYPE = buildVsphereVlanType();

/**
 * vSphere VLAN — VMware Offer satisfying the abstract Subnet. Inherits the
 * vendor-neutral `cidrBlock`; vendor-only knobs (e.g. name, vlanId, gateway,
 * dvSwitchName, datacenter) are not part of the Interface and would be set on
 * this offer directly if required.
 */
export const VsphereVlan: Offer = {
  type: VSPHERE_VLAN_TYPE,
  provider: 'VMware',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, VSPHERE_VLAN_TYPE, 'VMware'),
  ],
};
