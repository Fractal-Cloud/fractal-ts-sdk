import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `DistributedDataProcessing` — the abstract BigData capability "I need a
 * managed distributed data processing platform (Databricks)". It is satisfied by
 * candidate Offers (AwsDatabricks/AWS, AzureDatabricks/Azure, GcpDatabricks/GCP).
 * The dev specializes it through a Fractal Interface using vendor-neutral
 * concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): none. Every Databricks
 * offer's knobs are vendor-specific (e.g. Azure `managedResourceGroupName`,
 * AWS `credentialsId` / `storageConfigurationId`, per-provider `networkId`), so
 * they live on the individual offers, NOT on this Interface.
 */
export type DistributedDataProcessingConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this distributed data processing platform. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace DistributedDataProcessing {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'DistributedDataProcessing';

  export const create = (
    config: DistributedDataProcessingConfig,
  ): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.BigData,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
