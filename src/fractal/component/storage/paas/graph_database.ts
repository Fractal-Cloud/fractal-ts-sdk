import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `GraphDatabase` — the abstract Storage capability "I need a managed graph
 * database" (a graph hosted within a graph DBMS). It is satisfied by candidate
 * Offers (e.g. AzureCosmosDbGremlinDatabase on Azure). The dev specializes it
 * through a Fractal Interface using vendor-neutral concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): none today — only one
 * candidate offer exists, so every knob is an offer-level extra and lives on that
 * offer, NOT on this Interface.
 *
 * Depends on a `GraphDbms` — a GraphDatabase cannot exist without the graph DBMS
 * that hosts it; declare that DBMS as a dependency when authoring the Fractal.
 */
export type GraphDatabaseConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this graph database. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace GraphDatabase {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'GraphDatabase';

  export const create = (config: GraphDatabaseConfig): AbstractComponent =>
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
