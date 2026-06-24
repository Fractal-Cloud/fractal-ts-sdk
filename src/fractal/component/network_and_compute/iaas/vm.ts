import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';

/**
 * `VirtualMachine` — the abstract NetworkAndCompute capability "I need a virtual
 * machine". It is satisfied by candidate Offers (EC2 on AWS, AzureVm on Azure,
 * GceInstance on GCP, HetznerServer, OciInstance, ArubaCloudServer, VsphereVm,
 * OpenshiftVirtualMachine, ...). The dev specializes it through a Fractal
 * Interface; the Provider chosen at LiveSystem time selects the matching Offer.
 *
 * Neutral-vs-vendor split: a knob is a Fractal Interface op (neutral) iff ≥2
 * candidate offers share it. The VM offers across these eight providers have
 * fully disjoint vendor parameter sets (amiId/instanceType for EC2, vmSize for
 * Azure, machineType for GCP, serverType for Hetzner, shape for OCI, flavorName
 * for Aruba, template for vSphere, image/namespace for OpenShift). No knob is
 * shared by two or more offers, so there are NO neutral Interface ops here — the
 * abstract component carries only its identity, dependencies, and links, and the
 * vendor-only extras live on each offer's own builder/config.
 */
export type VirtualMachineConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this virtual machine. */
  offers: Offer[];
  /** Dependencies declared on the abstract component, inherited by the offer. */
  dependencies?: BlueprintComponentDependency[];
  /** Links declared on the abstract component, inherited by the offer. */
  links?: ComponentLink[];
};

export namespace VirtualMachine {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'VirtualMachine';

  export const create = (config: VirtualMachineConfig): AbstractComponent =>
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
