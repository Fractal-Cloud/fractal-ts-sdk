/**
 * offers/network_and_compute.ts — NetworkAndCompute Offer catalogue (Level 3).
 *
 * Each offer declares which abstract Component it satisfies, its 3-part offer
 * type, its vendor (provider) and delivery model, and carries vendor knobs in
 * its config type. Offers with no extra vendor knobs use config type `{}`.
 *
 * Region: every cloud-provider offer (AWS/Azure/GCP/OCI/Hetzner) carries an
 * optional `region`. When omitted the agent falls back to the environment's
 * region (unchanged behavior). The wire param key is uniformly `region`.
 * Cluster-scoped offers (CaaS, self-hosted, vSphere/OpenShift) take their region
 * from the underlying cluster and therefore do NOT expose it.
 */
import {defineOffer} from '../core';
import {KUBERNETES_WORKLOAD_OFFER_TYPE} from './offer_type_ids';
import type {
  InstantiationContext,
  LiveSystemComponent,
  Provider,
} from '../core';

/**
 * A ContainerPlatform offer emits itself PLUS one Workload live component per
 * child the application added under it (e.g. a workload added via a
 * `withStatefulService` operation). Workloads on a cluster are vendor-neutral
 * Kubernetes workloads (`CustomWorkloads.CaaS.KubernetesWorkload`) regardless
 * of the cluster's cloud — swapping AKS↔EKS↔GKE keeps the workload portable.
 * Children carry their own dependencies (on this platform) and links (e.g. → a
 * database).
 */
const containerPlatformInstantiate =
  (platformType: string, provider: Provider) =>
  (ctx: InstantiationContext, config: unknown): LiveSystemComponent[] => [
    {
      id: ctx.id,
      displayName: ctx.displayName,
      type: platformType,
      provider,
      deliveryModel: 'PaaS',
      parameters: {...ctx.parameters, ...(config as Record<string, unknown>)},
      dependencies: [...ctx.dependencies],
      links: [...ctx.links],
    },
    ...ctx.children.map(child => ({
      id: child.id,
      displayName: child.displayName,
      type: KUBERNETES_WORKLOAD_OFFER_TYPE,
      deliveryModel: 'CaaS' as const,
      parameters: {...child.parameters},
      dependencies: [...child.dependencies],
      links: [...child.links],
    })),
  ];

// ── VirtualNetwork ───────────────────────────────────────────────────────────
export const AwsVpc = defineOffer<
  'NetworkAndCompute.VirtualNetwork',
  {region?: string}
>({
  satisfies: 'NetworkAndCompute.VirtualNetwork',
  offerType: 'NetworkAndCompute.IaaS.AwsVpc',
  provider: 'AWS',
  deliveryModel: 'IaaS',
});
export const AzureVnet = defineOffer<
  'NetworkAndCompute.VirtualNetwork',
  {region?: string}
>({
  satisfies: 'NetworkAndCompute.VirtualNetwork',
  offerType: 'NetworkAndCompute.IaaS.AzureVnet',
  provider: 'Azure',
  deliveryModel: 'IaaS',
});
export const GcpVpc = defineOffer<
  'NetworkAndCompute.VirtualNetwork',
  {region?: string}
>({
  satisfies: 'NetworkAndCompute.VirtualNetwork',
  offerType: 'NetworkAndCompute.IaaS.GcpVpc',
  provider: 'GCP',
  deliveryModel: 'IaaS',
});

// ── Subnet ───────────────────────────────────────────────────────────────────
export const AwsSubnet = defineOffer<
  'NetworkAndCompute.Subnet',
  {
    region?: string;
    /**
     * Availability Zone to place the subnet in (e.g. `eu-central-1b`). Omit to let
     * the agent choose.
     *
     * Only matters when something placed in these subnets needs a known zone
     * spread — an RDS DB subnet group must span at least two. Without it the
     * agent's default placement (the environment spoke's per-AZ private subnets)
     * is the one that guarantees the spread, so this is the knob for the operator
     * who is overriding that deliberately.
     */
    availabilityZone?: string;
  }
>({
  satisfies: 'NetworkAndCompute.Subnet',
  offerType: 'NetworkAndCompute.IaaS.AwsSubnet',
  provider: 'AWS',
  deliveryModel: 'IaaS',
});
export const AzureSubnet = defineOffer<
  'NetworkAndCompute.Subnet',
  {region?: string}
>({
  satisfies: 'NetworkAndCompute.Subnet',
  offerType: 'NetworkAndCompute.IaaS.AzureSubnet',
  provider: 'Azure',
  deliveryModel: 'IaaS',
});
export const GcpSubnet = defineOffer<
  'NetworkAndCompute.Subnet',
  {region?: string}
>({
  satisfies: 'NetworkAndCompute.Subnet',
  offerType: 'NetworkAndCompute.IaaS.GcpSubnet',
  provider: 'GCP',
  deliveryModel: 'IaaS',
});

// ── SecurityGroup ────────────────────────────────────────────────────────────
export const AwsSecurityGroup = defineOffer<
  'NetworkAndCompute.SecurityGroup',
  {region?: string}
>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  offerType: 'NetworkAndCompute.IaaS.AwsSecurityGroup',
  provider: 'AWS',
  deliveryModel: 'IaaS',
});
export const AzureNsg = defineOffer<
  'NetworkAndCompute.SecurityGroup',
  {region?: string; resourceGroup: string}
>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  offerType: 'NetworkAndCompute.IaaS.AzureNsg',
  provider: 'Azure',
  deliveryModel: 'IaaS',
});
export const GcpFirewall = defineOffer<
  'NetworkAndCompute.SecurityGroup',
  {region?: string}
>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  offerType: 'NetworkAndCompute.IaaS.GcpFirewall',
  provider: 'GCP',
  deliveryModel: 'IaaS',
});

// ── VirtualMachine ───────────────────────────────────────────────────────────

/**
 * Vendor-agnostic VM workload identity. Attach an identity so software on the VM reaches cloud
 * resources (object storage, secret store, …) WITHOUT injected keys. Each vendor reads only the
 * fields it understands; the whole object is forwarded to the agent under the uniform `identity`
 * param key.
 *
 * Least-privilege is the default — broad grants (e.g. GCP `cloud-platform`) are opt-in via `scopes`
 * / `policyStatements`. Never place raw credentials on a VM; attach an identity instead.
 */
export interface VmIdentity {
  /** GCP: service-account email to attach to the instance. */
  serviceAccount?: string;
  /** GCP: OAuth scopes. Omit and the agent falls back to `cloud-platform` (IAM then governs). */
  scopes?: string[];
  /** AWS: IAM instance-profile name to attach. */
  instanceProfile?: string;
  /** Azure: `"system"` for a system-assigned identity, or a user-assigned identity resource id. */
  managedIdentity?: string;
  /** OCI: enable an instance principal (agent creates a dynamic group matching the instance). */
  instancePrincipal?: boolean;
  /** OCI: IAM policy statements granted to the instance's dynamic group. */
  policyStatements?: string[];
}

export const Ec2Instance = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  {
    region?: string;
    amiId?: string;
    instanceType: string;
    userData?: string;
    identity?: VmIdentity;
    /**
     * Give the instance an auto-assigned public IPv4 address. Defaults to `false`.
     *
     * The AWS agent forwards this to `associatePublicIpAddress` on the instance's
     * primary network-interface spec, and reports the result in the `publicIp`
     * output field. The address is assigned regardless of routing, so it is only
     * reachable when the subnet the instance lands in routes to an internet
     * gateway.
     *
     * The address is ephemeral. Attaching an existing Elastic IP is not
     * expressible here, and the agent's EC2 create path has no code for it.
     */
    associatePublicIp?: boolean;
  }
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  offerType: 'NetworkAndCompute.IaaS.AwsEc2Instance',
  provider: 'AWS',
  deliveryModel: 'IaaS',
});
export const AzureVm = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  {
    region?: string;
    vmSize: string;
    userData?: string;
    imageId?: string;
    identity?: VmIdentity;
    /**
     * Give the VM a public IPv4 address. Defaults to `false`.
     *
     * The Azure agent creates a Public IP resource and attaches it to the VM's
     * primary NIC, and reports the address in the `publicIp` output field.
     *
     * The address is dynamic and Azure-allocated. Attaching an existing static or
     * reserved Public IP is not expressible here, and the agent's VM create path
     * has no code for it.
     */
    associatePublicIp?: boolean;
  }
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  offerType: 'NetworkAndCompute.IaaS.AzureVm',
  provider: 'Azure',
  deliveryModel: 'IaaS',
});
/**
 * Note the absence of `associatePublicIp`, which `Ec2Instance`, `AzureVm` and
 * `HetznerServer` all expose. The omission is deliberate: the GCP agent builds the
 * instance's `NetworkInterface` from a subnetwork only and never adds an
 * `AccessConfig`, so a GCP VM is private-only today and a boolean here would be
 * silently ignored. Adding the field belongs with the agent-side create path, not
 * before it.
 */
export const GcpVm = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  {
    region?: string;
    machineType: string;
    userData?: string;
    imageLink?: string;
    identity?: VmIdentity;
  }
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  offerType: 'NetworkAndCompute.IaaS.GcpVm',
  provider: 'GCP',
  deliveryModel: 'IaaS',
});
export const VsphereVm = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  {template: string; userData?: string}
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  offerType: 'NetworkAndCompute.IaaS.VsphereVm',
  provider: 'VMware',
  deliveryModel: 'IaaS',
});
export const OpenshiftVm = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  {userData?: string}
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  offerType: 'NetworkAndCompute.CaaS.OpenshiftVm',
  provider: 'RedHat',
  deliveryModel: 'CaaS',
});

// ── ContainerPlatform ────────────────────────────────────────────────────────
export const Eks = defineOffer<
  'NetworkAndCompute.ContainerPlatform',
  {region?: string}
>({
  satisfies: 'NetworkAndCompute.ContainerPlatform',
  offerType: 'NetworkAndCompute.PaaS.AwsEks',
  provider: 'AWS',
  deliveryModel: 'PaaS',
  instantiate: containerPlatformInstantiate(
    'NetworkAndCompute.PaaS.AwsEks',
    'AWS',
  ),
});
export const Aks = defineOffer<
  'NetworkAndCompute.ContainerPlatform',
  {region?: string}
>({
  satisfies: 'NetworkAndCompute.ContainerPlatform',
  offerType: 'NetworkAndCompute.PaaS.AzureAks',
  provider: 'Azure',
  deliveryModel: 'PaaS',
  instantiate: containerPlatformInstantiate(
    'NetworkAndCompute.PaaS.AzureAks',
    'Azure',
  ),
});
export const Gke = defineOffer<
  'NetworkAndCompute.ContainerPlatform',
  {region?: string}
>({
  satisfies: 'NetworkAndCompute.ContainerPlatform',
  offerType: 'NetworkAndCompute.PaaS.GcpGke',
  provider: 'GCP',
  deliveryModel: 'PaaS',
  instantiate: containerPlatformInstantiate(
    'NetworkAndCompute.PaaS.GcpGke',
    'GCP',
  ),
});

// ── LoadBalancer ─────────────────────────────────────────────────────────────
export const AwsLb = defineOffer<
  'NetworkAndCompute.LoadBalancer',
  {region?: string}
>({
  satisfies: 'NetworkAndCompute.LoadBalancer',
  offerType: 'NetworkAndCompute.IaaS.AwsLb',
  provider: 'AWS',
  deliveryModel: 'IaaS',
});
export const AzureLb = defineOffer<
  'NetworkAndCompute.LoadBalancer',
  {region?: string}
>({
  satisfies: 'NetworkAndCompute.LoadBalancer',
  offerType: 'NetworkAndCompute.IaaS.AzureLb',
  provider: 'Azure',
  deliveryModel: 'IaaS',
});
export const GcpGlb = defineOffer<
  'NetworkAndCompute.LoadBalancer',
  {region?: string}
>({
  satisfies: 'NetworkAndCompute.LoadBalancer',
  offerType: 'NetworkAndCompute.IaaS.GcpGlb',
  provider: 'GCP',
  deliveryModel: 'IaaS',
});

// ── OCI ──────────────────────────────────────────────────────────────────────
export const OciVcn = defineOffer<
  'NetworkAndCompute.VirtualNetwork',
  {region?: string}
>({
  satisfies: 'NetworkAndCompute.VirtualNetwork',
  offerType: 'NetworkAndCompute.IaaS.OciVcn',
  provider: 'OCI',
  deliveryModel: 'IaaS',
});
export const OciSubnet = defineOffer<
  'NetworkAndCompute.Subnet',
  {region?: string; availabilityDomain?: string}
>({
  satisfies: 'NetworkAndCompute.Subnet',
  offerType: 'NetworkAndCompute.IaaS.OciSubnet',
  provider: 'OCI',
  deliveryModel: 'IaaS',
});
export const OciSecurityList = defineOffer<
  'NetworkAndCompute.SecurityGroup',
  {region?: string; compartmentId: string}
>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  offerType: 'NetworkAndCompute.IaaS.OciSecurityList',
  provider: 'OCI',
  deliveryModel: 'IaaS',
});
export const OciInstance = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  {
    region?: string;
    shape: string;
    userData?: string;
    imageId?: string;
    identity?: VmIdentity;
  }
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  offerType: 'NetworkAndCompute.IaaS.OciInstance',
  provider: 'OCI',
  deliveryModel: 'IaaS',
});

// ── Hetzner ──────────────────────────────────────────────────────────────────
export const HetznerNetwork = defineOffer<
  'NetworkAndCompute.VirtualNetwork',
  {region?: string}
>({
  satisfies: 'NetworkAndCompute.VirtualNetwork',
  offerType: 'NetworkAndCompute.IaaS.HetznerNetwork',
  provider: 'Hetzner',
  deliveryModel: 'IaaS',
});
export const HetznerSubnet = defineOffer<
  'NetworkAndCompute.Subnet',
  {region?: string; networkZone?: string}
>({
  satisfies: 'NetworkAndCompute.Subnet',
  offerType: 'NetworkAndCompute.IaaS.HetznerSubnet',
  provider: 'Hetzner',
  deliveryModel: 'IaaS',
});
export const HetznerFirewall = defineOffer<
  'NetworkAndCompute.SecurityGroup',
  {region?: string}
>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  offerType: 'NetworkAndCompute.IaaS.HetznerFirewall',
  provider: 'Hetzner',
  deliveryModel: 'IaaS',
});
export const HetznerServer = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  {
    region?: string;
    serverType: string;
    userData?: string;
    /**
     * Give the server a public IPv4 and IPv6. Defaults to `false`.
     *
     * Hetzner assigns both address families when the posture is left unstated,
     * so the agent now always states it.
     *
     * A server without a public interface must be attached to a
     * `HetznerNetwork` to have any interface at all.
     */
    associatePublicIp?: boolean;
  }
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  offerType: 'NetworkAndCompute.IaaS.HetznerServer',
  provider: 'Hetzner',
  deliveryModel: 'IaaS',
});

// ── VMware (vSphere) ─────────────────────────────────────────────────────────
export const VspherePortGroup = defineOffer<
  'NetworkAndCompute.VirtualNetwork',
  {dvSwitchName?: string}
>({
  satisfies: 'NetworkAndCompute.VirtualNetwork',
  offerType: 'NetworkAndCompute.IaaS.VspherePortGroup',
  provider: 'VMware',
  deliveryModel: 'IaaS',
});
export const VsphereVlan = defineOffer<
  'NetworkAndCompute.Subnet',
  {vlanId?: number}
>({
  satisfies: 'NetworkAndCompute.Subnet',
  offerType: 'NetworkAndCompute.IaaS.VsphereVlan',
  provider: 'VMware',
  deliveryModel: 'IaaS',
});

// ── OpenShift (RedHat, CaaS) ─────────────────────────────────────────────────
export const OpenshiftSecurityGroup = defineOffer<
  'NetworkAndCompute.SecurityGroup',
  {name?: string}
>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  offerType: 'NetworkAndCompute.CaaS.OpenshiftNetworkPolicy',
  provider: 'RedHat',
  deliveryModel: 'CaaS',
});
export const OpenshiftService = defineOffer<
  'NetworkAndCompute.LoadBalancer',
  {}
>({
  satisfies: 'NetworkAndCompute.LoadBalancer',
  offerType: 'NetworkAndCompute.CaaS.OpenshiftService',
  provider: 'RedHat',
  deliveryModel: 'CaaS',
});
