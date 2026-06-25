import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `MessagingEntity` — the abstract Messaging capability "I need a messaging
 * entity" (a topic, queue, event hub, or pub/sub subscription). It is satisfied
 * by candidate Offers (e.g. AzureServiceBusTopic, AzureServiceBusQueue and
 * AzureEventHub on Azure; GcpPubSubTopic and GcpPubSubSubscription on GCP). The
 * dev specializes it through a Fractal Interface using vendor-neutral concepts
 * only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): `messageRetentionHours`,
 * `azureRegion`, `azureResourceGroup`. Vendor-only knobs (e.g. EventHub's
 * `partitionCount` / `messageRetentionInDays`) live on the individual offers,
 * NOT on this Interface.
 *
 * A MessagingEntity logically depends on a Broker (the messaging namespace /
 * service hosting it); the infra team wires that dependency when authoring the
 * Fractal.
 */
export const MESSAGE_RETENTION_HOURS_PARAM = 'messageRetentionHours';
export const AZURE_REGION_PARAM = 'azureRegion';
export const AZURE_RESOURCE_GROUP_PARAM = 'azureResourceGroup';

export type MessagingEntityConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this messaging entity. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace MessagingEntity {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'Entity';

  export const create = (config: MessagingEntityConfig): AbstractComponent =>
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
