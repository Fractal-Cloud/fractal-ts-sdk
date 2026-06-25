import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `CaaSBroker` — the abstract Messaging capability "I need a message broker".
 * It is satisfied by candidate Offers (e.g. Kafka on CaaS). The dev specializes
 * it through a Fractal Interface using vendor-neutral concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): none. Every knob the
 * single Kafka offer supports (namespace, clusterName) is vendor-only and lives
 * on that offer, NOT on this Interface.
 *
 * The infra team wires any dependencies/links when authoring the Fractal.
 */
export type CaaSBrokerConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this broker. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace CaaSBroker {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'Broker';

  export const create = (config: CaaSBrokerConfig): AbstractComponent =>
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
