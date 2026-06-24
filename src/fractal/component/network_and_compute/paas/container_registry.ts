import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';

/**
 * `ContainerRegistry` — the abstract NetworkAndCompute capability "I need a
 * managed container image registry". It is satisfied by candidate Offers (e.g.
 * ArubaContainerRegistry on Aruba). The dev specializes it through a Fractal
 * Interface using vendor-neutral concepts only.
 *
 * Neutral-vs-vendor split: a knob is a Fractal Interface op (set via
 * `component.set(key, value)`) iff >=2 candidate offers share it. The only
 * neutral knob exposed here is `size`; everything vendor-specific stays on the
 * offer's own config and is NOT exposed on this Interface.
 */
export type ContainerRegistryConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this container registry. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace ContainerRegistry {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'ContainerRegistry';

  /** Neutral Interface op key shared by candidate offers. */
  export const SIZE_PARAM = 'size';

  export const create = (config: ContainerRegistryConfig): AbstractComponent =>
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
