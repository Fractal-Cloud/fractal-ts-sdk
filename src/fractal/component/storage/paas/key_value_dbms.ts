import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `KeyValueDbms` — the abstract Storage capability "I need a key-value database
 * management platform". It is satisfied by candidate Offers (e.g. AwsDynamoDb on
 * AWS, AzureCosmosDb on Azure, GcpBigtable on GCP). The dev specializes it through
 * a Fractal Interface using vendor-neutral concepts only.
 *
 * Neutral Interface ops (shared by >=2 candidate offers): none in v1 — every knob
 * a key-value platform exposes (region, throughput, resource group, instance
 * type, ...) is vendor-specific and lives on the individual offers, NOT on this
 * Interface.
 */
export type KeyValueDbmsConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this key-value DBMS. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace KeyValueDbms {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'KeyValueDbms';

  export const create = (config: KeyValueDbmsConfig): AbstractComponent =>
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
