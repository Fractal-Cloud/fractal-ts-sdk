import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';

/**
 * `ElasticIp` — the abstract NetworkAndCompute capability "I need a static,
 * reservable public IP address". It is satisfied by candidate Offers (e.g.
 * ArubaElasticIp on Aruba). The dev specializes it through a Fractal Interface;
 * the Provider chosen at LiveSystem time selects the matching Offer.
 *
 * Neutral-vs-vendor split: a knob is a Fractal Interface op (neutral) iff ≥2
 * candidate offers share it. There is currently a single candidate offer
 * (ArubaElasticIp), so no knob is shared by two or more offers and there are NO
 * neutral Interface ops here — the abstract component carries only its identity,
 * dependencies, and links, and any vendor-only extras live on each offer's own
 * builder/config. When a second provider's elastic IP offer is added, promote
 * any knob both offers share to a neutral Interface op.
 */
export type ElasticIpConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this elastic IP. */
  offers: Offer[];
  /** Dependencies declared on the abstract component, inherited by the offer. */
  dependencies?: BlueprintComponentDependency[];
  /** Links declared on the abstract component, inherited by the offer. */
  links?: ComponentLink[];
};

export namespace ElasticIp {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'ElasticIp';

  export const create = (config: ElasticIpConfig): AbstractComponent =>
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
