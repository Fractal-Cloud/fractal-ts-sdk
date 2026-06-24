import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.ArubaVpnTunnel
// Matches aria-agent-aruba handlers/vpn_tunnel.go.
const ARUBA_VPN_TUNNEL_TYPE_NAME = 'ArubaVpnTunnel';

function buildArubaVpnTunnelType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_VPN_TUNNEL_TYPE_NAME)
        .build(),
    )
    .build();
}

const ARUBA_VPN_TUNNEL_TYPE = buildArubaVpnTunnelType();

/**
 * Aruba VPN Tunnel — Aruba-managed site-to-site VPN tunnel Offer satisfying the
 * abstract VpnTunnel. Inherits all vendor-neutral parameters (peerPublicIp,
 * presharedKey, subnetCidr); adds no vendor-only knobs and no sub-components.
 */
export const ArubaVpnTunnel: Offer = {
  type: ARUBA_VPN_TUNNEL_TYPE,
  provider: 'Aruba',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, ARUBA_VPN_TUNNEL_TYPE, 'Aruba'),
  ],
};
