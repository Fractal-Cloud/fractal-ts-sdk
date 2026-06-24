import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Matches aria-agent-aruba handlers/cloud_server.go:
// NetworkAndCompute.IaaS.ArubaCloudServer
const ARUBA_CLOUD_SERVER_TYPE_NAME = 'ArubaCloudServer';

// Vendor-only parameter keys carried by this offer: flavorName, bootVolume,
// userData.

function buildArubaCloudServerType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_CLOUD_SERVER_TYPE_NAME)
        .build(),
    )
    .build();
}

const ARUBA_CLOUD_SERVER_TYPE = buildArubaCloudServerType();

/**
 * Aruba Cloud Server — Aruba IaaS virtual machine Offer satisfying the abstract
 * VirtualMachine. Inherits all vendor-neutral parameters, dependencies and
 * links. No vendor sub-components.
 */
export const ArubaCloudServer: Offer = {
  type: ARUBA_CLOUD_SERVER_TYPE,
  provider: 'Aruba',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, ARUBA_CLOUD_SERVER_TYPE, 'Aruba'),
  ],
};
