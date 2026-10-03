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
import {
  AZURE_CONTAINER_APPS_ENVIRONMENT_OFFER_TYPE,
  KUBERNETES_WORKLOAD_OFFER_TYPE,
} from './offer_type_ids';
import {toKubernetesWorkloadParameters} from './kubernetes_workload_contract';
import type {
  InstantiationContext,
  LiveSystemComponent,
  Provider,
} from '../core';
import type {EksAutoModeNodePool} from './eks_auto_mode_node_pool';
import type {EksControlPlaneLogType} from './eks_control_plane_log_type';

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
      // The child is emitted under the caas-k8s offer type without ever being
      // offer-selected, so `K8sWorkload.instantiate` never runs for it and this
      // is the only place its parameters are named. It needs the same neutral
      // `image` → `containerImage` translation the selected path gets; without
      // it a child workload ships a key the agent's contract does not declare
      // and fails with `containerImage is required when manifestUri is not set`.
      parameters: toKubernetesWorkloadParameters(
        {...child.parameters},
        child.id,
        child.locked ?? [],
      ),
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
export const GcpVm = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  {
    region?: string;
    machineType: string;
    userData?: string;
    imageLink?: string;
    identity?: VmIdentity;
    /**
     * Give the VM an external IPv4 address. Defaults to `false`.
     *
     * An external address on GCP is not a field on the instance: it is an
     * `AccessConfig` of type `ONE_TO_ONE_NAT` on the instance's primary network
     * interface. The GCP agent adds one at create time when this is set, and
     * reports the address in the `publicIp` output field.
     *
     * The address is ephemeral, and `networkTier` is left to the project default.
     * Attaching a reserved (static) `Address` resource is not expressible here —
     * it has its own lifecycle, region and quota — and the agent's create path has
     * no code for it.
     *
     * Unlike a service account, an access config can be added to or removed from a
     * running instance, so flipping this on an existing VM is honored on the next
     * reconcile. Turning it off releases the ephemeral address permanently.
     */
    associatePublicIp?: boolean;
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
const EKS_LOG_TYPES: readonly EksControlPlaneLogType[] = [
  'api',
  'audit',
  'authenticator',
  'controllerManager',
  'scheduler',
];
const EKS_ARCHITECTURES = ['arm64', 'amd64'];
const EKS_BUILT_IN_POOLS = ['system', 'general-purpose'];
const DNS_1123_LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const EKS_CAPACITY_TYPES = ['on-demand', 'spot'];

const refuseEks = (id: string, why: string): never => {
  throw new Error(`Eks '${id}': ${why}.`);
};

const ensureValidNodePools = (
  id: string,
  pools: readonly EksAutoModeNodePool[],
): void => {
  const names = new Set<string>();
  for (const pool of pools) {
    if (pool.name.trim() === '') {
      refuseEks(id, 'a node pool needs a name');
    }
    if (!DNS_1123_LABEL.test(pool.name)) {
      refuseEks(
        id,
        `node pool name '${pool.name}' is not a DNS-1123 label (a-z, 0-9 and '-', at most 63)`,
      );
    }
    if (EKS_BUILT_IN_POOLS.includes(pool.name)) {
      refuseEks(
        id,
        `node pool name '${pool.name}' is reserved for an EKS Auto Mode built-in pool`,
      );
    }
    if (names.has(pool.name)) {
      refuseEks(id, `node pool name '${pool.name}' twice`);
    }
    names.add(pool.name);
    const badArch = (pool.architectures ?? []).find(
      a => !EKS_ARCHITECTURES.includes(a),
    );
    if (badArch !== undefined) {
      refuseEks(
        id,
        `node pool '${pool.name}' architectures holds '${badArch}' (arm64 or amd64)`,
      );
    }
    const badCapacity = (pool.capacityTypes ?? []).find(
      c => !EKS_CAPACITY_TYPES.includes(c),
    );
    if (badCapacity !== undefined) {
      refuseEks(
        id,
        `node pool '${pool.name}' capacityTypes holds '${badCapacity}' (on-demand or spot)`,
      );
    }
  }
};

type EksConfig = {
  region?: string;
  /**
   * Custom EKS Auto Mode NodePools, e.g. Graviton on-demand
   * `{name: 'graviton', architectures: ['arm64'], instanceFamilies: ['m7g'],
   * capacityTypes: ['on-demand']}`. Replaces the neutral `withNodePools` value,
   * so it is refused when that value is a locked guardrail.
   */
  nodePools?: readonly EksAutoModeNodePool[];
  /** Control-plane logs shipped to CloudWatch; the agent defaults to api and authenticator. */
  controlPlaneLogTypes?: readonly EksControlPlaneLogType[];
};

/**
 * Amazon EKS (Auto Mode). The Kubernetes version is the neutral
 * `withKubernetesVersion`. Workloads added under it are emitted as caas-k8s
 * Kubernetes workloads.
 */
export const Eks = defineOffer<
  'NetworkAndCompute.ContainerPlatform',
  EksConfig
>({
  satisfies: 'NetworkAndCompute.ContainerPlatform',
  offerType: 'NetworkAndCompute.PaaS.AwsEks',
  provider: 'AWS',
  deliveryModel: 'PaaS',
  instantiate: (ctx, config) => {
    if (
      config.nodePools !== undefined &&
      (ctx.locked ?? []).includes('nodePools')
    ) {
      throw new Error(
        `Parameter 'nodePools' on '${ctx.id}' is a locked guardrail, and the Eks ` +
          "offer's nodePools would replace it. Drop the offer's nodePools, or the " +
          "'.withNodePools()' guardrail if the pools are the offer's to choose.",
      );
    }
    return containerPlatformInstantiate('NetworkAndCompute.PaaS.AwsEks', 'AWS')(
      ctx,
      config,
    );
  },
  validate: (self, _all, config) => {
    ensureValidNodePools(self.id, config.nodePools ?? []);
    const badLog = (config.controlPlaneLogTypes ?? []).find(
      t => !EKS_LOG_TYPES.includes(t),
    );
    if (badLog !== undefined) {
      refuseEks(
        self.id,
        `controlPlaneLogTypes holds '${badLog}' (one of ${EKS_LOG_TYPES.join(', ')})`,
      );
    }
  },
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

/**
 * The managed environment Azure Container Apps run in.
 *
 * The catalogue files it under `ContainerPlatform` — it is a platform that hosts
 * containers, not a Kubernetes cluster — and `AzureContainerApp` REQUIRES one:
 * the agent resolves it as a dependency by type and reads the provisioned
 * `environmentId` off its output fields. Without this offer that dependency was
 * unexpressible from TypeScript, and every Container App failed in the agent
 * with `has no AzureContainerAppsEnvironment dependency`. Declare one and point
 * each Container App at it with `.dependsOn(...)`.
 *
 * `location` is REQUIRED, and spelled `location` rather than this file's uniform
 * `region`. Both halves are forced by the agent: its config reads `location` and
 * nothing else, and unlike its sibling `AzureContainerApp` — which falls back to
 * the resolved component region when its own is blank — the environment hands
 * `config.location()` straight to ARM's `withRegion(...)` with no guard. An
 * omitted `location` is therefore not a default, it is an empty region string and
 * a failed deployment. `region` is a real parameter every Azure offer declares,
 * but this component never consults it, so setting it would deploy nothing.
 *
 * `resourceGroup` is deliberately ABSENT. The agent never reads a flat
 * `resourceGroup` key: it resolves the group from the `azureResourceGroup` map
 * parameter (a map with a `name` key), falling back to the LiveSystem's group.
 * Offering the flat string here would provision into the LiveSystem's group while
 * the author read their own value back. The other two knobs are genuinely
 * optional — supply both to attach Log Analytics, or neither. `name` is not a
 * parameter at all; the agent uses the component id.
 *
 * Unlike `Eks`/`Aks`/`Gke` this offer does NOT use `containerPlatformInstantiate`.
 * That helper emits each app-added child as a Kubernetes workload, which is right
 * for a cluster and wrong here: this platform's children are Container Apps, a
 * path no offer emits yet. With the default `instantiate` a child is not silently
 * mis-typed — `toLiveSystem` refuses the selection outright.
 */
export const AzureContainerAppsEnvironment = defineOffer<
  'NetworkAndCompute.ContainerPlatform',
  {
    location: string;
    logAnalyticsWorkspaceId?: string;
    logAnalyticsSharedKey?: string;
  }
>({
  satisfies: 'NetworkAndCompute.ContainerPlatform',
  offerType: AZURE_CONTAINER_APPS_ENVIRONMENT_OFFER_TYPE,
  provider: 'Azure',
  deliveryModel: 'PaaS',
});

/**
 * The config `AzureContainerAppsEnvironment` takes — and the guard that keeps
 * `location` required.
 *
 * `RequiresLocation` constrains its argument to `{location: string}`, so if the
 * offer's config ever loosens `location` to optional this alias stops compiling.
 * That matters more than it looks: an omitted `location` reaches ARM as an empty
 * region, and the agent has no fallback for this component.
 *
 * The guard lives HERE, next to the offer, rather than as a `@ts-expect-error` in
 * the spec, because `tsconfig.json` excludes every `.test.ts` file — `tsc` never
 * reads one, vitest strips types without checking them, and `gts lint` is not
 * type-aware, so a type assertion written in a spec is evaluated by nothing at all.
 */
type RequiresLocation<T extends {location: string}> = T;
export type AzureContainerAppsEnvironmentConfig = RequiresLocation<
  Parameters<typeof AzureContainerAppsEnvironment>[0]
>;

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
