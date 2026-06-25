import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `MessagingUnmanaged` — the abstract Messaging capability "I need an unmanaged
 * (external / SaaS) messaging endpoint". It is satisfied by candidate Offers
 * (e.g. MessagingSaaSUnmanaged on SaaS). The dev specializes it through a Fractal
 * Interface using vendor-neutral concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): none — an unmanaged
 * messaging endpoint carries no vendor-neutral knobs. Vendor-only knobs, if any,
 * live on the individual offers, NOT on this Interface.
 *
 * This abstract declares no intrinsic dependencies; the infra team wires any
 * dependency when authoring the Fractal.
 */
export type MessagingUnmanagedConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this unmanaged messaging endpoint. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace MessagingUnmanaged {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'Unmanaged';

  export const create = (config: MessagingUnmanagedConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.Messaging,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
