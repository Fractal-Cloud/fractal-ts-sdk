import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';

/**
 * `VpcPeering` — the abstract NetworkAndCompute capability "I need a VPC peering
 * connection". It is satisfied by candidate Offers (e.g. ArubaVpcPeering on
 * Aruba). The dev specializes it through a Fractal Interface using vendor-neutral
 * concepts only.
 *
 * Neutral knob shared by every candidate offer — and therefore a Fractal
 * Interface op:
 *   - `peerVpcId`
 *
 * Vendor-only extras (region, accountId, routeTableIds, ...) live on each offer,
 * never on the Interface.
 */

/** Neutral parameter key carried by every VpcPeering offer. */
export const PEER_VPC_ID_PARAM = 'peerVpcId';

export type VpcPeeringConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this VPC peering connection. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace VpcPeering {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'VpcPeering';

  /** Neutral parameter key carried by every VpcPeering offer. */
  export const PEER_VPC_ID_PARAM = 'peerVpcId';

  export const create = (config: VpcPeeringConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.NetworkAndCompute,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
