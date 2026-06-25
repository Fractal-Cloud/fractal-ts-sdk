import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `Broker` — the abstract Messaging capability "I need a managed message broker".
 * It is satisfied by candidate Offers (e.g. AzureServiceBus, AzureRelay and
 * AzureEventHubNamespace on Azure, GcpPubSub on GCP). The dev specializes it
 * through a Fractal Interface using vendor-neutral concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): `azureRegion`,
 * `azureResourceGroup`, `sku`. Set via `component.set(key, value)`.
 *
 * Vendor-only knobs (e.g. AzureEventHubNamespace's `kafkaEnabled`,
 * `autoInflateEnabled`, `maximumThroughputUnits`, `minimumTlsVersion`,
 * `publicNetworkAccess`, `skuName`, `skuTier`, `skuCapacity`, `zoneRedundant`)
 * are offer-level extras supported by a single offer, and therefore live on that
 * offer, NOT on this Interface.
 */
export const AZURE_REGION_PARAM = 'azureRegion';
export const AZURE_RESOURCE_GROUP_PARAM = 'azureResourceGroup';
export const SKU_PARAM = 'sku';

export type BrokerConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this broker. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace Broker {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'Broker';

  export const create = (config: BrokerConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.Messaging,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
