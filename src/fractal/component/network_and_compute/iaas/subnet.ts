import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';

/**
 * `Subnet` — the abstract NetworkAndCompute capability "I need a subnet". It is
 * satisfied by candidate Offers (AwsSubnet on AWS, AzureSubnet on Azure,
 * GcpSubnet on GCP, HetznerSubnet on Hetzner, OciSubnet on OCI, ArubaSubnet on
 * Aruba, VsphereVlan / VspherePortGroup on VMware). The dev specializes it
 * through a Fractal Interface using vendor-neutral concepts only.
 *
 * Neutral knob shared by every candidate offer — and therefore a Fractal
 * Interface op:
 *   - `cidrBlock`
 *
 * Vendor-only extras (availabilityZone, resourceGroup, region, networkZone,
 * compartmentId, vlanId, ...) live on each offer, never on the Interface.
 */

/** Neutral parameter key carried by every Subnet offer. */
export const CIDR_BLOCK_PARAM = 'cidrBlock';

export type SubnetConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this subnet. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace Subnet {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'Subnet';

  export const create = (config: SubnetConfig): AbstractComponent =>
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
