import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `ServiceMesh` — the abstract Security capability "I need a service mesh /
 * ingress gateway for east-west and north-south traffic governance". It is
 * satisfied by candidate Offers (e.g. Ocelot on CaaS). The dev specializes it
 * through a Fractal Interface using vendor-neutral concepts only; every
 * vendor-specific knob lives on the offer, not the Interface.
 */
export type ServiceMeshConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this service mesh. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace ServiceMesh {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'ServiceMesh';

  export const create = (config: ServiceMeshConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.Security,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
