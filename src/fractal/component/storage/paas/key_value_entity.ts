import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `KeyValueEntity` — the abstract Storage capability "I need a key-value entity"
 * (a single table/keyspace within a key-value datastore). It is satisfied by
 * candidate Offers (e.g. AzureCosmosDbTable on Azure). The dev specializes it
 * through a Fractal Interface using vendor-neutral concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): none in v1 — every
 * configurable knob is vendor-specific and lives on the individual offers, NOT on
 * this Interface.
 *
 * Dependencies: a `KeyValueEntity` lives inside a key-value datastore, so it
 * normally declares a dependency on a `KeyValueDbms` component (the author wires
 * this through `dependencies` at Fractal-authoring time).
 */
export type KeyValueEntityConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this key-value entity. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace KeyValueEntity {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'KeyValueEntity';

  export const create = (config: KeyValueEntityConfig): AbstractComponent =>
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
