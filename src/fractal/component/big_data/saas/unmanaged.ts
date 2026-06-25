import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `BigDataUnmanaged` — the abstract BigData capability "I reference an unmanaged
 * (external / pre-existing) big-data system". It is satisfied by candidate Offers
 * (e.g. BigDataSaaSUnmanaged on SaaS). The dev specializes it through a Fractal
 * Interface using vendor-neutral concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): none — Unmanaged carries
 * no vendor-neutral knobs. Vendor-only knobs live on the individual offers, NOT on
 * this Interface.
 */
export type BigDataUnmanagedConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this unmanaged big-data capability. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace BigDataUnmanaged {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'Unmanaged';

  export const create = (config: BigDataUnmanagedConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.BigData,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
