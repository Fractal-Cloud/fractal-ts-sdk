import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `GraphDbms` — the abstract Storage capability "I need a managed graph database
 * management system". It is satisfied by candidate Offers (e.g. AzureCosmosDbGremlin
 * on Azure). The dev specializes it through a Fractal Interface using vendor-neutral
 * concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): none today — only one
 * candidate offer exists, so every knob is an offer-level extra and lives on that
 * offer, NOT on this Interface.
 */
export type GraphDbmsConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this graph DBMS. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace GraphDbms {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'GraphDbms';

  export const create = (config: GraphDbmsConfig): AbstractComponent =>
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
