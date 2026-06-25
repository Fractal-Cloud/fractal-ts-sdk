import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `SearchEntity` — the abstract Storage capability "I need a search entity"
 * (e.g. an index pattern over a search backend). It is satisfied by candidate
 * Offers (e.g. IndexPattern on CaaS). The dev specializes it through a Fractal
 * Interface using vendor-neutral concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): none — this capability
 * has a single CaaS offer today, so every knob (namespace, pattern, timeField,
 * isDefault) is an offer-only extra living on the IndexPattern offer, NOT on this
 * Interface.
 *
 * A SearchEntity typically depends on a `Search` backend component declared by
 * the Fractal author.
 */
export type SearchEntityConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this search entity. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace SearchEntity {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'SearchEntity';

  export const create = (config: SearchEntityConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.Storage,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
