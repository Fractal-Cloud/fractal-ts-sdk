import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `Tracing` — the abstract Observability capability "I need distributed
 * tracing". It is satisfied by candidate Offers (e.g. Jaeger on CaaS). The dev
 * specializes it through a Fractal Interface using vendor-neutral concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): none. Every knob the
 * sole candidate offer (Jaeger) supports — `namespace`, `storage`,
 * `elasticInstances`, `elasticVersion` — is vendor-only and lives on that offer,
 * NOT on this Interface.
 */
export type TracingConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this tracing capability. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace Tracing {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'Tracing';

  export const create = (config: TracingConfig): AbstractComponent =>
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
