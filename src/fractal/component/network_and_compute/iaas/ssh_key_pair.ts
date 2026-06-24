import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';

/**
 * `SshKeyPair` — the abstract NetworkAndCompute capability "I need an SSH key
 * pair". It is satisfied by candidate Offers (ArubaSshKeyPair on Aruba). The dev
 * specializes it through a Fractal Interface using vendor-neutral concepts only.
 *
 * Neutral knobs shared by every candidate offer — and therefore Fractal
 * Interface ops:
 *   - `publicKey`
 *   - `keyName`
 *
 * Vendor-only extras (if any) live on each offer, never on the Interface.
 */

/** Neutral parameter key carried by every SshKeyPair offer. */
export const PUBLIC_KEY_PARAM = 'publicKey';

/** Neutral parameter key carried by every SshKeyPair offer. */
export const KEY_NAME_PARAM = 'keyName';

export type SshKeyPairConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this SSH key pair. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace SshKeyPair {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'SshKeyPair';

  export const create = (config: SshKeyPairConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.NetworkAndCompute,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
