import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `RelationalDbms` — the abstract Storage capability "I need a relational
 * DBMS". It is satisfied by candidate Offers (e.g. ArubaMsSqlDbms / ArubaMySqlDbms
 * on Aruba, PostgreSqlDbms on Azure and on GCP). The dev specializes it through a
 * Fractal Interface using vendor-neutral concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): `version` (engine
 * version) and `flavorName`. Set them via `component.set(key, value)`.
 *
 * Vendor-only knobs (azureRegion, azureResourceGroup, rootUser, skuName,
 * storageGb, backupRetentionDays for Azure; region, tier, storageAutoResize for
 * GCP) live on the individual offers, NOT on this Interface.
 */
export const VERSION_PARAM = 'version';
export const FLAVOR_NAME_PARAM = 'flavorName';

export type RelationalDbmsConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this relational DBMS. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace RelationalDbms {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'RelationalDbms';

  export const create = (config: RelationalDbmsConfig): AbstractComponent =>
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
