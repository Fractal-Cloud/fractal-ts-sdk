import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `RelationalDatabase` — the abstract Storage capability "I need a relational
 * database". It is satisfied by candidate Offers (e.g. AzurePostgreSqlDatabase
 * and AzureCosmosDbPostgreSqlDatabase on Azure, GcpPostgreSqlDatabase on GCP).
 * The dev specializes it through a Fractal Interface using vendor-neutral
 * concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): `collation`, `charset`.
 * Vendor-only knobs live on the individual offers, NOT on this Interface.
 *
 * A RelationalDatabase logically depends on a RelationalDbms (the DBMS hosting
 * it); the infra team wires that dependency when authoring the Fractal.
 */
export const COLLATION_PARAM = 'collation';
export const CHARSET_PARAM = 'charset';

export type RelationalDatabaseConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this relational database. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace RelationalDatabase {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'RelationalDatabase';

  export const create = (config: RelationalDatabaseConfig): AbstractComponent =>
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
