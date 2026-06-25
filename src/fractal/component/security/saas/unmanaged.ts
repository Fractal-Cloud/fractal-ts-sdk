import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';

/**
 * `SecurityUnmanaged` — the abstract Security capability "I rely on an
 * unmanaged (SaaS / externally-owned) security component". It is satisfied by
 * candidate Offers (e.g. the `Unmanaged` SaaS offer). The dev specializes it
 * through a Fractal Interface using vendor-neutral concepts only.
 *
 * There are no vendor-neutral parameters in v1: an unmanaged component carries
 * no managed knobs. It declares no dependencies and no links of its own.
 */
export type SecurityUnmanagedConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this unmanaged security component. */
  offers: Offer[];
};

export namespace SecurityUnmanaged {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'Unmanaged';

  export const create = (config: SecurityUnmanagedConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.Security,
      serviceName: SERVICE_NAME,
      offers: config.offers,
    });
}
