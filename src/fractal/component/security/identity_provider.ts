import {
  createAbstractComponent,
  AbstractComponent,
} from '../abstract_component';
import {Offer} from '../../offer';
import {InfrastructureDomain} from '../../../values/infrastructure_domain';

/**
 * `IdentityProvider` — the abstract Security capability "I need an identity
 * provider". It is satisfied by candidate Offers (e.g. Cognito on AWS, Keycloak
 * on CaaS). The dev specializes it through a Fractal Interface using vendor-neutral
 * concepts only (directory name, password policy, MFA, app client).
 */
export type IdentityProviderConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this identity provider. */
  offers: Offer[];
};

export namespace IdentityProvider {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'IdP';

  export const create = (config: IdentityProviderConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.Security,
      serviceName: SERVICE_NAME,
      offers: config.offers,
    });
}
