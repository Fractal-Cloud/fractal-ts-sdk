import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `Monitoring` — the abstract Observability capability "I need a metrics /
 * monitoring stack". It is satisfied by candidate Offers (e.g. Prometheus on
 * CaaS). The dev specializes it through a Fractal Interface using vendor-neutral
 * concepts only.
 *
 * There are no neutral Interface ops: with a single candidate offer no knob is
 * shared by ≥2 offers, so every Prometheus knob (`namespace`, `apiGatewayUrl`)
 * is an offer-only extra and lives on that offer, NOT on this Interface.
 */
export type MonitoringConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this monitoring capability. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace Monitoring {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'Monitoring';

  export const create = (config: MonitoringConfig): AbstractComponent =>
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
