import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `APIGateway` — the abstract APIManagement capability "I need an API gateway /
 * ingress". It is satisfied by candidate Offers (e.g. Ambassador and Traefik on
 * CaaS). The dev specializes it through a Fractal Interface using vendor-neutral
 * concepts only.
 *
 * Neutral Interface op (shared by ≥2 candidate offers): `namespace`. Every
 * vendor-only knob (host/ACME on Ambassador, OIDC/TLS settings on Traefik) lives
 * on the individual offers, NOT on this Interface.
 */
export const NAMESPACE_PARAM = 'namespace';

export type APIGatewayConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this API gateway. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace APIGateway {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'APIGateway';

  export const create = (config: APIGatewayConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.ApiManagement,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
