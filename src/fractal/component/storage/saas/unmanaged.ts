import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `Unmanaged` — the abstract Storage capability "I depend on a storage resource
 * that Fractal does not provision or reconcile". It is satisfied by candidate
 * Offers (e.g. SaaSUnmanaged on the SaaS provider). The dev specializes it
 * through a Fractal Interface using vendor-neutral concepts only.
 *
 * There are no neutral Interface ops for this capability — an unmanaged resource
 * carries no provisioning knobs. It exists purely to declare an external
 * dependency in the blueprint.
 */
export type UnmanagedConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this unmanaged storage resource. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace Unmanaged {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'Unmanaged';

  export const create = (config: UnmanagedConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.Storage,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
