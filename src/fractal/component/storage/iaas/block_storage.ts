import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `BlockStorage` — the abstract Storage capability "I need a block storage
 * volume". It is satisfied by candidate Offers (e.g. ArubaBlockStorage on
 * Aruba). The dev specializes it through a Fractal Interface using
 * vendor-neutral concepts only.
 *
 * There are no neutral Interface ops yet (only one candidate offer exists, so no
 * knob is shared by ≥2 offers). Vendor-only knobs (sizeGb, type on Aruba) live on
 * the individual offers and are set via `component.set(key, value)`, NOT promoted
 * to this Interface until a second offer shares them.
 */
export const NEUTRAL_PARAM_KEYS = [] as const;

export type BlockStorageConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this block storage volume. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace BlockStorage {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'ArubaBlockStorage';

  export const create = (config: BlockStorageConfig): AbstractComponent =>
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
