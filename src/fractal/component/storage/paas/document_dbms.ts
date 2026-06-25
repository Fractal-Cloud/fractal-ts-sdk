import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `DocumentDbms` — the abstract Storage capability "I need a managed document
 * database management system". It is satisfied by candidate Offers (e.g.
 * AzureCosmosDbAccount on Azure, GcpFirestore on GCP). The dev specializes it
 * through a Fractal Interface using vendor-neutral concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): none in v1 — every
 * candidate offer differs in its tuning knobs, so all are offer-only extras
 * (azureRegion, azureResourceGroup, maxTotalThroughput, publicNetworkAccess on
 * Cosmos DB; nothing extra on Firestore). They live on the individual offers,
 * NOT on this Interface.
 */
export type DocumentDbmsConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this document DBMS. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace DocumentDbms {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'DocumentDbms';

  export const create = (config: DocumentDbmsConfig): AbstractComponent =>
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
