import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';

/**
 * `ContainerPlatform` — the abstract NetworkAndCompute capability "I need a
 * managed container platform (Kubernetes)". It is satisfied by candidate Offers
 * (EKS on AWS, AKS on Azure, GKE on GCP, KaaS on Aruba). The dev specializes it
 * through a Fractal Interface using vendor-neutral concepts only.
 *
 * Neutral-vs-vendor split: a knob is a Fractal Interface op (set via
 * `component.set(key, value)`) iff >=2 candidate offers share it. The only knob
 * shared by all four offers here is `nodePools`; everything else
 * (kubernetesVersion, CIDR ranges, addons, workload identity, ...) is supported
 * by a single offer's own config and therefore stays vendor-only — NOT exposed
 * on this Interface.
 */
export type NodePoolConfig = {
  name: string;
  diskSizeGb?: number;
  minNodeCount?: number;
  maxNodeCount?: number;
  maxPodsPerNode?: number;
  autoscalingEnabled?: boolean;
  initialNodeCount?: number;
  maxSurge?: number;
};

export type ContainerPlatformConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this container platform. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace ContainerPlatform {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'ContainerPlatform';

  /** Neutral Interface op key shared by >=2 offers. */
  export const NODE_POOLS_PARAM = 'nodePools';

  export const create = (config: ContainerPlatformConfig): AbstractComponent =>
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
