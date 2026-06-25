import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `Logging` — the abstract Observability capability "I need centralized log
 * collection and search". It is satisfied by candidate Offers (e.g.
 * ObservabilityElastic on CaaS). The dev specializes it through a Fractal
 * Interface using vendor-neutral concepts only.
 *
 * No neutral Interface ops: every candidate offer's knobs (namespace,
 * elasticVersion, elasticInstances, storage, isApmRequired, isKibanaRequired)
 * are vendor-only and live on the individual offers, NOT on this Interface.
 *
 * Logging declares no dependencies of its own; the infra team wires any when
 * authoring the Fractal.
 */
export type LoggingConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this logging capability. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace Logging {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'Logging';

  export const create = (config: LoggingConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.Observability,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
