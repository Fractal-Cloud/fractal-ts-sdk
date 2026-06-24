import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';

/**
 * `VpnTunnel` — the abstract NetworkAndCompute capability "I need a site-to-site
 * VPN tunnel". It is satisfied by candidate Offers (e.g. ArubaVpnTunnel on
 * Aruba IaaS). The dev specializes it through a Fractal Interface using
 * vendor-neutral concepts only (peer public IP, preshared key, subnet CIDR).
 */
export type VpnTunnelConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this VPN tunnel. */
  offers: Offer[];
};

export namespace VpnTunnel {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'VpnTunnel';

  /** Vendor-neutral parameter keys shared by every candidate offer. */
  export const NEUTRAL_KEYS = ['peerPublicIp', 'presharedKey', 'subnetCidr'];

  export const create = (config: VpnTunnelConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.NetworkAndCompute,
      serviceName: SERVICE_NAME,
      offers: config.offers,
    });
}
