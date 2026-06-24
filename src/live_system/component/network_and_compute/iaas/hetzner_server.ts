import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.HetznerServer
const HETZNER_SERVER_TYPE_NAME = 'HetznerServer';

// Vendor-only parameter keys carried by this offer: serverType, location,
// image, sshKeys, userData.

function buildHetznerServerType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(HETZNER_SERVER_TYPE_NAME).build(),
    )
    .build();
}

const HETZNER_SERVER_TYPE = buildHetznerServerType();

/**
 * Hetzner Cloud Server — Hetzner IaaS virtual machine Offer satisfying the
 * abstract VirtualMachine. Inherits all vendor-neutral parameters, dependencies
 * and links. No vendor sub-components.
 */
export const HetznerServer: Offer = {
  type: HETZNER_SERVER_TYPE,
  provider: 'Hetzner',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, HETZNER_SERVER_TYPE, 'Hetzner'),
  ],
};
