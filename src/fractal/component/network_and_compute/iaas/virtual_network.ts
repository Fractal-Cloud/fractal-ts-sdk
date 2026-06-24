import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `VirtualNetwork` — the abstract NetworkAndCompute capability "I need a virtual
 * network". It is satisfied by candidate Offers (e.g. AwsVpc on AWS, VNet on
 * Azure, GcpVpc on GCP, HetznerNetwork on Hetzner, OciVcn on OCI, ArubaVpc on
 * Aruba). The dev specializes it through a Fractal Interface using vendor-neutral
 * concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): `cidrBlock`.
 * Vendor-only knobs (instanceTenancy, location, resourceGroup, routingMode, ...)
 * live on the individual offers, NOT on this Interface.
 */
export const CIDR_BLOCK_PARAM = 'cidrBlock';

export type VirtualNetworkConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this virtual network. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace VirtualNetwork {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'VirtualNetwork';

  export const create = (config: VirtualNetworkConfig): AbstractComponent =>
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
