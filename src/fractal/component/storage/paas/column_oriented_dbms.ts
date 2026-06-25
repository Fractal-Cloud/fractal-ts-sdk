import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `ColumnOrientedDbms` — the abstract Storage capability "I need a
 * column-oriented (wide-column) database management system". It is satisfied by
 * candidate Offers (e.g. AzureCosmosDbCassandra on Azure, GcpBigTable on GCP).
 * The dev specializes it through a Fractal Interface using vendor-neutral
 * concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): none in v1 — every
 * candidate offer's knobs (azureRegion, azureResourceGroup, cassandraVersion,
 * hoursBetweenBackups, region, instanceType, storageType, clusterNodeCount,
 * replicationEnabled, ...) are vendor-only and live on the individual offers,
 * NOT on this Interface.
 */
export type ColumnOrientedDbmsConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this column-oriented DBMS. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace ColumnOrientedDbms {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'ColumnOrientedDbms';

  export const create = (config: ColumnOrientedDbmsConfig): AbstractComponent =>
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
