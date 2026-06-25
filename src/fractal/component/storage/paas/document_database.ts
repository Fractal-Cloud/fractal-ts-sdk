import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `DocumentDatabase` — the abstract Storage capability "I need a document
 * database". It is satisfied by candidate Offers (e.g. CosmosDbMongoDatabase on
 * Azure, FirestoreCollection on GCP). The dev specializes it through a Fractal
 * Interface using vendor-neutral concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): none — every knob the
 * candidate offers expose is vendor-only and lives on the individual offers, NOT
 * on this Interface.
 *
 * Capability dependency: a DocumentDatabase depends on a `DocumentDbms`
 * capability. The infra team wires that dependency at authoring time via the
 * abstract component's `dependencies` config; it is inherited by whichever offer
 * the provider selects.
 */
export type DocumentDatabaseConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this document database. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace DocumentDatabase {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'DocumentDatabase';

  export const create = (config: DocumentDatabaseConfig): AbstractComponent =>
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
