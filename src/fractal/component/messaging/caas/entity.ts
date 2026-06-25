import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `CaaSMessagingEntity` — the abstract Messaging capability "I need a messaging
 * entity (topic/queue) on a self-managed broker". It is satisfied by candidate
 * Offers (e.g. KafkaTopic on a CaaS Kafka broker). The dev specializes it through
 * a Fractal Interface using vendor-neutral concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): none — every knob this
 * capability exposes is offer-specific (e.g. KafkaTopic's `namespace`), so it
 * lives on the individual offer, NOT on this Interface.
 *
 * A CaaSMessagingEntity logically depends on a CaaSBroker (the self-managed
 * broker hosting it); the infra team wires that dependency when authoring the
 * Fractal via `dependencies`.
 */
export type CaaSMessagingEntityConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this messaging entity. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace CaaSMessagingEntity {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'Entity';

  export const create = (
    config: CaaSMessagingEntityConfig,
  ): AbstractComponent =>
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
