import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `LoadBalancer` — the abstract NetworkAndCompute capability "I need a load
 * balancer". It is satisfied by candidate Offers (e.g. an AWS ELB, an Azure
 * Load Balancer, a GCP Global Load Balancer). The dev specializes it through a
 * Fractal Interface using vendor-neutral concepts only.
 *
 * Neutral-vs-vendor split: every knob the candidate offers expose
 * (loadBalancerType, internal, sku, frontendIpConfiguration, loadBalancingScheme,
 * portRange, target, ...) is supported by exactly one offer, so none qualifies
 * as a Fractal Interface op (an op requires ≥2 candidate offers sharing it).
 * The neutral Interface op set for this capability is therefore empty: devs
 * specialize structurally (dependencies + links), and the Provider selects the
 * concrete offer that carries its own vendor-only extras.
 */
export type LoadBalancerConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this load balancer. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace LoadBalancer {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'LoadBalancer';

  export const create = (config: LoadBalancerConfig): AbstractComponent =>
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
