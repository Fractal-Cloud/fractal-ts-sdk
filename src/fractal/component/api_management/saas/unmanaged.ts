import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `ApiManagementUnmanaged` — the abstract APIManagement capability "I need an
 * unmanaged (externally owned) API management endpoint". It is satisfied by
 * candidate Offers (e.g. ApiManagementSaaSUnmanaged on SaaS). The dev
 * specializes it through a Fractal Interface using vendor-neutral concepts only.
 *
 * This capability has no vendor-neutral knobs — every setting is offer-specific
 * — so the Interface declares no neutral ops. It declares no built-in
 * dependencies either; the infra team wires any prerequisites when authoring the
 * Fractal.
 */
export type ApiManagementUnmanagedConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this unmanaged API management endpoint. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace ApiManagementUnmanaged {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'Unmanaged';

  export const create = (
    config: ApiManagementUnmanagedConfig,
  ): AbstractComponent =>
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
