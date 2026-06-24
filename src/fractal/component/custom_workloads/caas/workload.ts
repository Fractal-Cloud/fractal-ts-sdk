import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

export const WORKLOAD_TYPE_NAME = 'Workload';
export const CONTAINER_IMAGE_PARAM = 'containerImage';
export const CONTAINER_PORT_PARAM = 'containerPort';
export const CONTAINER_NAME_PARAM = 'containerName';
export const CPU_PARAM = 'cpu';
export const MEMORY_PARAM = 'memory';
export const DESIRED_COUNT_PARAM = 'desiredCount';
export const ENV_PARAM = 'env';
export const ENV_FROM_PARAM = 'envFrom';
export const SECRET_MOUNTS_PARAM = 'secretMounts';
export const IMAGE_PULL_SECRETS_PARAM = 'imagePullSecrets';
export const RESOURCE_REQUESTS_PARAM = 'resourceRequests';
export const RESOURCE_LIMITS_PARAM = 'resourceLimits';
export const SERVICE_ACCOUNT_PARAM = 'serviceAccount';

// ── Neutral Interface keys (Fractal + Interface migration) ────────────────────
// A knob is a neutral Interface op iff >=2 candidate offers share it. The four
// keys below are shared by the Workload offers (ECS Service, Cloud Run, Azure
// Container App/Instance, OCI Container Instance, OpenShift Service) and are set
// through the Fractal Interface via `component.set(key, value)`.
export const IMAGE_PARAM = 'image';
export const PORT_PARAM = 'port';
export const REPLICAS_PARAM = 'replicas';
export const ENV_NEUTRAL_PARAM = 'env';

// ── Fractal + Interface abstract component ────────────────────────────────────

/**
 * Config for the vendor-neutral `Workload` abstract component. The dev declares
 * the candidate Offers (one per provider) plus any blueprint dependencies/links;
 * the Provider chosen at LiveSystem time selects the matching Offer.
 */
export type WorkloadConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this workload (one per provider). */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace Workload {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'Workload';

  /**
   * Build the abstract `Workload` capability ("I need to run a container
   * workload"). Satisfied by candidate Offers (ECS Service on AWS, Cloud Run on
   * GCP, Container App/Instance on Azure, Container Instance on OCI, OpenShift
   * Service on RedHat). The dev specializes it through the Fractal Interface
   * using vendor-neutral keys only — `image`, `port`, `replicas`, `env`
   * (set via `component.set(key, value)`); everything else (launch type, region,
   * resource group, ...) is an offer-only extra and stays off the Interface.
   */
  export const abstract = (config: WorkloadConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.CustomWorkloads,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
