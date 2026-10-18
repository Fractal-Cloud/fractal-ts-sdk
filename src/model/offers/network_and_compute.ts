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
import {
  awsInstanceType,
  azureVmSize,
  gcpMachineType,
  ociShape,
} from './vm_sizes';
import {toContractKey, unsupported} from './neutral_rules';
import {
  NetworkAndCompute_CaaS_OpenshiftIpAddressPool,
  NetworkAndCompute_CaaS_OpenshiftSecurityGroup,
  NetworkAndCompute_CaaS_OpenshiftService,
  NetworkAndCompute_IaaS_AwsEc2Instance,
  NetworkAndCompute_IaaS_AwsLb,
  NetworkAndCompute_IaaS_AwsSecurityGroup,
  NetworkAndCompute_IaaS_AwsSubnet,
  NetworkAndCompute_IaaS_AwsVpc,
  NetworkAndCompute_IaaS_AzureLb,
  NetworkAndCompute_IaaS_AzureNsg,
  NetworkAndCompute_IaaS_AzureSubnet,
  NetworkAndCompute_IaaS_AzureVm,
  NetworkAndCompute_IaaS_AzureVnet,
  NetworkAndCompute_IaaS_GcpFirewall,
  NetworkAndCompute_IaaS_GcpGlb,
  NetworkAndCompute_IaaS_GcpSubnet,
  NetworkAndCompute_IaaS_GcpVm,
  NetworkAndCompute_IaaS_GcpVpc,
  NetworkAndCompute_IaaS_OciInstance,
  NetworkAndCompute_IaaS_OciSecurityList,
  NetworkAndCompute_IaaS_OciSubnet,
  NetworkAndCompute_IaaS_OciVcn,
  NetworkAndCompute_IaaS_OpenshiftVirtualMachine,
  NetworkAndCompute_PaaS_AwsEks,
  NetworkAndCompute_PaaS_AzureAks,
  NetworkAndCompute_PaaS_AzureContainerAppsEnvironment,
  NetworkAndCompute_PaaS_GcpGke,
  NetworkAndCompute_PaaS_ECS,
} from './generated/network_and_compute';
import type {ContractConfig} from './contract/contract_config';
import {contractKey} from './contract/contract_key';
import {defineOffer} from '../core';
import {KUBERNETES_WORKLOAD_OFFER_TYPE} from './offer_type_ids';
import {toKubernetesWorkloadParameters} from './kubernetes_workload_contract';
import {toLbScheme} from './load_balancer_scheme_parameters';
import {
  composeVendorParameters,
  dropParameter,
  instantiateWithVendorParameters,
  renameParameter,
} from './vendor_parameters';
import type {VendorParameters} from './vendor_parameters';
import {toHetznerEgressRules} from './hetzner_firewall_rules';
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
  ContractConfig<typeof NetworkAndCompute_IaaS_AwsVpc, 'cidrBlock'>
>({
  satisfies: 'NetworkAndCompute.VirtualNetwork',
  contract: NetworkAndCompute_IaaS_AwsVpc,
  provider: 'AWS',
  deliveryModel: 'IaaS',
  neutral: {
    tags: unsupported('the agent applies no tags to it'),
  },
});
export const AzureVnet = defineOffer<
  'NetworkAndCompute.VirtualNetwork',
  ContractConfig<typeof NetworkAndCompute_IaaS_AzureVnet, 'cidrBlock'>
>({
  satisfies: 'NetworkAndCompute.VirtualNetwork',
  contract: NetworkAndCompute_IaaS_AzureVnet,
  provider: 'Azure',
  deliveryModel: 'IaaS',
  neutral: {
    tags: unsupported('the agent applies no tags to it'),
  },
});
export const GcpVpc = defineOffer<
  'NetworkAndCompute.VirtualNetwork',
  ContractConfig<typeof NetworkAndCompute_IaaS_GcpVpc>
>({
  satisfies: 'NetworkAndCompute.VirtualNetwork',
  contract: NetworkAndCompute_IaaS_GcpVpc,
  provider: 'GCP',
  deliveryModel: 'IaaS',
  neutral: {
    cidrBlock: unsupported(
      'a custom-mode GCP VPC has no address range; its subnets carry it',
    ),
    tags: unsupported('the agent applies no tags to it'),
  },
});

// ── Subnet ───────────────────────────────────────────────────────────────────
export const AwsSubnet = defineOffer<
  'NetworkAndCompute.Subnet',
  ContractConfig<
    typeof NetworkAndCompute_IaaS_AwsSubnet,
    'cidrBlock',
    {
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
  >
>({
  satisfies: 'NetworkAndCompute.Subnet',
  contract: NetworkAndCompute_IaaS_AwsSubnet,
  provider: 'AWS',
  deliveryModel: 'IaaS',
});
export const AzureSubnet = defineOffer<
  'NetworkAndCompute.Subnet',
  ContractConfig<typeof NetworkAndCompute_IaaS_AzureSubnet, 'cidrBlock'>
>({
  satisfies: 'NetworkAndCompute.Subnet',
  contract: NetworkAndCompute_IaaS_AzureSubnet,
  provider: 'Azure',
  deliveryModel: 'IaaS',
});
export const GcpSubnet = defineOffer<
  'NetworkAndCompute.Subnet',
  ContractConfig<typeof NetworkAndCompute_IaaS_GcpSubnet, 'cidrBlock'>
>({
  satisfies: 'NetworkAndCompute.Subnet',
  contract: NetworkAndCompute_IaaS_GcpSubnet,
  provider: 'GCP',
  deliveryModel: 'IaaS',
});

// ── SecurityGroup ────────────────────────────────────────────────────────────
export const AwsSecurityGroup = defineOffer<
  'NetworkAndCompute.SecurityGroup',
  ContractConfig<
    typeof NetworkAndCompute_IaaS_AwsSecurityGroup,
    'ingressRules' | 'egressRules'
  >
>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  contract: NetworkAndCompute_IaaS_AwsSecurityGroup,
  provider: 'AWS',
  deliveryModel: 'IaaS',
});
export const AzureNsg = defineOffer<
  'NetworkAndCompute.SecurityGroup',
  ContractConfig<
    typeof NetworkAndCompute_IaaS_AzureNsg,
    'ingressRules' | 'egressRules'
  >
>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  contract: NetworkAndCompute_IaaS_AzureNsg,
  provider: 'Azure',
  deliveryModel: 'IaaS',
});
export const GcpFirewall = defineOffer<
  'NetworkAndCompute.SecurityGroup',
  ContractConfig<
    typeof NetworkAndCompute_IaaS_GcpFirewall,
    'ingressRules' | 'egressRules'
  >
>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  contract: NetworkAndCompute_IaaS_GcpFirewall,
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
  ContractConfig<
    typeof NetworkAndCompute_IaaS_AwsEc2Instance,
    // Filled by the neutral withPublicSSHKey.
    'publicSSHKey',
    {
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
  >
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  contract: NetworkAndCompute_IaaS_AwsEc2Instance,
  provider: 'AWS',
  deliveryModel: 'IaaS',
  neutral: {
    osType: unsupported('the operating system follows amiId'),
    size: toContractKey(
      NetworkAndCompute_IaaS_AwsEc2Instance,
      'instanceType',
      awsInstanceType,
    ),
    tags: unsupported('the agent applies no tags to it'),
  },
});
export const AzureVm = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  ContractConfig<
    typeof NetworkAndCompute_IaaS_AzureVm,
    'publicSSHKey',
    {
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
  >
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  contract: NetworkAndCompute_IaaS_AzureVm,
  provider: 'Azure',
  deliveryModel: 'IaaS',
  neutral: {
    osType: unsupported('the operating system follows imageId'),
    size: toContractKey(NetworkAndCompute_IaaS_AzureVm, 'vmSize', azureVmSize),
    tags: unsupported('the agent applies no tags to it'),
  },
});
export const GcpVm = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  ContractConfig<
    typeof NetworkAndCompute_IaaS_GcpVm,
    'publicSSHKey',
    {
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
  >
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  contract: NetworkAndCompute_IaaS_GcpVm,
  provider: 'GCP',
  deliveryModel: 'IaaS',
  neutral: {
    osType: unsupported('the operating system follows imageLink'),
    size: toContractKey(
      NetworkAndCompute_IaaS_GcpVm,
      'machineType',
      gcpMachineType,
    ),
    tags: unsupported('the agent applies no tags to it'),
  },
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
/**
 * A KubeVirt virtual machine (OpenShift Virtualization). The agent refuses a
 * VM without `name` and `image`, so both are required here although its
 * contract leaves them optional.
 */
export const OpenshiftVm = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  ContractConfig<
    typeof NetworkAndCompute_IaaS_OpenshiftVirtualMachine,
    // Filled from the neutral withPublicSSHKey.
    'sshPublicKey',
    {name: string; image: string}
  >
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  contract: NetworkAndCompute_IaaS_OpenshiftVirtualMachine,
  provider: 'RedHat',
  deliveryModel: 'IaaS',
  neutral: {
    publicSSHKey: toContractKey(
      NetworkAndCompute_IaaS_OpenshiftVirtualMachine,
      'sshPublicKey',
    ),
    osType: unsupported('the operating system follows image'),
    size: unsupported('the VM is sized by cpuCores and memorySizeGi'),
    tags: unsupported('the agent applies no tags to it'),
  },
});

type EksConfig = ContractConfig<
  typeof NetworkAndCompute_PaaS_AwsEks,
  // Filled from the neutral withKubernetesVersion.
  'kubernetesVersion',
  {
    /**
     * Custom EKS Auto Mode NodePools, e.g. Graviton on-demand
     * `{name: 'graviton', architectures: ['arm64'], instanceFamilies: ['m7g'],
     * capacityTypes: ['on-demand']}`. Replaces the neutral `withNodePools` value,
     * so it is refused when that value is a locked guardrail.
     */
    nodePools?: readonly EksAutoModeNodePool[];
    /**
     * Opt-in control-plane logs, shipped to CloudWatch Logs. Absent (the default):
     * a new cluster gets none and an existing cluster's logging is left as it is.
     * A list is reconciled: the listed types on, every other one off, so `[]`
     * turns logging off.
     */
    controlPlaneLogTypes?: readonly EksControlPlaneLogType[];
  }
>;

/**
 * Amazon EKS (Auto Mode). The Kubernetes version is the neutral
 * `withKubernetesVersion` (`<major>.<minor>`): unset, the cluster is never
 * upgraded; a newer version is applied one minor per round; a downgrade is
 * refused. Workloads added under it are emitted as caas-k8s
 * Kubernetes workloads.
 */
export const Eks = defineOffer<
  'NetworkAndCompute.ContainerPlatform',
  EksConfig
>({
  satisfies: 'NetworkAndCompute.ContainerPlatform',
  contract: NetworkAndCompute_PaaS_AwsEks,
  provider: 'AWS',
  deliveryModel: 'PaaS',
  neutral: {
    // fractal-cloud-agents v8.25.10 no longer declares it: EKS Auto Mode
    // enforces network policies with its own VPC CNI.
    networkPolicyProvider: unsupported(
      'the agent declares no network policy provider for EKS Auto Mode',
    ),
  },
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
    return containerPlatformInstantiate(
      NetworkAndCompute_PaaS_AwsEks.offerType,
      'AWS',
    )(ctx, config);
  },
});
export const Aks = defineOffer<
  'NetworkAndCompute.ContainerPlatform',
  ContractConfig<typeof NetworkAndCompute_PaaS_AzureAks, 'nodePools'>
>({
  satisfies: 'NetworkAndCompute.ContainerPlatform',
  contract: NetworkAndCompute_PaaS_AzureAks,
  provider: 'Azure',
  deliveryModel: 'PaaS',
  neutral: {
    kubernetesVersion: unsupported(
      'the agent declares no Kubernetes version for AKS',
    ),
    networkPolicyProvider: unsupported(
      'the agent declares no network policy provider for AKS',
    ),
  },
  instantiate: containerPlatformInstantiate(
    NetworkAndCompute_PaaS_AzureAks.offerType,
    'Azure',
  ),
});
export const Gke = defineOffer<
  'NetworkAndCompute.ContainerPlatform',
  ContractConfig<
    typeof NetworkAndCompute_PaaS_GcpGke,
    'kubernetesVersion' | 'networkPolicyProvider' | 'nodePools'
  >
>({
  satisfies: 'NetworkAndCompute.ContainerPlatform',
  contract: NetworkAndCompute_PaaS_GcpGke,
  provider: 'GCP',
  deliveryModel: 'PaaS',
  instantiate: containerPlatformInstantiate(
    NetworkAndCompute_PaaS_GcpGke.offerType,
    'GCP',
  ),
});

/**
 * An Amazon ECS cluster (`NetworkAndCompute.PaaS.ECS`), the platform an
 * `EcsService` workload runs on: the AWS agent resolves the service's cluster
 * from a dependency of this type. It is not a Kubernetes cluster, so the
 * Kubernetes guardrails of `ContainerPlatform` are refused, and workloads added
 * as its children are not emitted (select `EcsService` for a Workload that
 * depends on it instead).
 */
export const EcsCluster = defineOffer<
  'NetworkAndCompute.ContainerPlatform',
  ContractConfig<typeof NetworkAndCompute_PaaS_ECS>
>({
  satisfies: 'NetworkAndCompute.ContainerPlatform',
  contract: NetworkAndCompute_PaaS_ECS,
  provider: 'AWS',
  deliveryModel: 'PaaS',
  neutral: {
    kubernetesVersion: unsupported(
      'an ECS cluster is not a Kubernetes cluster',
    ),
    networkPolicyProvider: unsupported(
      'an ECS cluster is not a Kubernetes cluster',
    ),
    nodePools: unsupported(
      'an ECS cluster runs Fargate tasks, not Kubernetes node pools',
    ),
  },
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
 * There is no `resourceGroup`: the agent resolves the group from the
 * `azureResourceGroup` map
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
  ContractConfig<
    typeof NetworkAndCompute_PaaS_AzureContainerAppsEnvironment,
    never,
    // Declared optional with default "", but the agent cannot work without it.
    {location: string}
  >
>({
  satisfies: 'NetworkAndCompute.ContainerPlatform',
  contract: NetworkAndCompute_PaaS_AzureContainerAppsEnvironment,
  provider: 'Azure',
  deliveryModel: 'PaaS',
  neutral: {
    kubernetesVersion: unsupported(
      'a Container Apps environment is not a Kubernetes cluster',
    ),
    networkPolicyProvider: unsupported(
      'a Container Apps environment is not a Kubernetes cluster',
    ),
    nodePools: unsupported(
      'a Container Apps environment is not a Kubernetes cluster',
    ),
  },
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

/**
 * A load balancer is placed only in the subnets it declares: the agents refuse
 * one without a Subnet dependency of their own cloud, and there is no fallback
 * placement. Checked here, against the selected offers, because the blueprint
 * cannot know which subnet offer its Subnet will get.
 */
const requireSubnetOf =
  (subnetType: string) =>
  (
    self: {id: string; dependencies: readonly string[]},
    all: readonly {id: string; type: string}[],
  ): void => {
    const subnets = self.dependencies.filter(
      d => all.find(c => c.id === d)?.type === subnetType,
    );
    if (subnets.length === 0) {
      throw new Error(
        `LoadBalancer '${self.id}' has no ${subnetType} dependency: a load balancer is ` +
          'placed only in the subnets it declares. Declare them with ' +
          `LoadBalancer({subnets: [...]}) and select ${subnetType} for each.`,
      );
    }
  };

// ── LoadBalancer ─────────────────────────────────────────────────────────────
// The neutral `withScheme` guardrail is emitted as `lbScheme`, the key every
// LoadBalancer agent reads, spelled the way that agent expects.
export const AwsLb = defineOffer<
  'NetworkAndCompute.LoadBalancer',
  ContractConfig<typeof NetworkAndCompute_IaaS_AwsLb, 'lbScheme'>
>({
  satisfies: 'NetworkAndCompute.LoadBalancer',
  contract: NetworkAndCompute_IaaS_AwsLb,
  provider: 'AWS',
  deliveryModel: 'IaaS',
  validate: requireSubnetOf(NetworkAndCompute_IaaS_AwsSubnet.offerType),
  instantiate: instantiateWithVendorParameters(
    NetworkAndCompute_IaaS_AwsLb.offerType,
    'AWS',
    'IaaS',
    toLbScheme(
      contractKey(NetworkAndCompute_IaaS_AwsLb, 'lbScheme'),
      scheme => scheme,
    ),
  ),
});
export const AzureLb = defineOffer<
  'NetworkAndCompute.LoadBalancer',
  ContractConfig<typeof NetworkAndCompute_IaaS_AzureLb, 'lbScheme'>
>({
  satisfies: 'NetworkAndCompute.LoadBalancer',
  contract: NetworkAndCompute_IaaS_AzureLb,
  provider: 'Azure',
  deliveryModel: 'IaaS',
  // The Azure agent provisions a public frontend only for `internet-facing`.
  validate: requireSubnetOf(NetworkAndCompute_IaaS_AzureSubnet.offerType),
  instantiate: instantiateWithVendorParameters(
    NetworkAndCompute_IaaS_AzureLb.offerType,
    'Azure',
    'IaaS',
    toLbScheme(
      contractKey(NetworkAndCompute_IaaS_AzureLb, 'lbScheme'),
      scheme => scheme,
    ),
  ),
});
export const GcpGlb = defineOffer<
  'NetworkAndCompute.LoadBalancer',
  ContractConfig<typeof NetworkAndCompute_IaaS_GcpGlb, 'lbScheme'>
>({
  satisfies: 'NetworkAndCompute.LoadBalancer',
  contract: NetworkAndCompute_IaaS_GcpGlb,
  provider: 'GCP',
  deliveryModel: 'IaaS',
  // Passed straight to the forwarding rule's `loadBalancingScheme`.
  validate: requireSubnetOf(NetworkAndCompute_IaaS_GcpSubnet.offerType),
  instantiate: instantiateWithVendorParameters(
    NetworkAndCompute_IaaS_GcpGlb.offerType,
    'GCP',
    'IaaS',
    toLbScheme(
      contractKey(NetworkAndCompute_IaaS_GcpGlb, 'lbScheme'),
      scheme => (scheme === 'internal' ? 'INTERNAL' : 'EXTERNAL'),
    ),
  ),
});

// ── OCI ──────────────────────────────────────────────────────────────────────
export const OciVcn = defineOffer<
  'NetworkAndCompute.VirtualNetwork',
  ContractConfig<typeof NetworkAndCompute_IaaS_OciVcn, 'cidrBlock'>
>({
  satisfies: 'NetworkAndCompute.VirtualNetwork',
  contract: NetworkAndCompute_IaaS_OciVcn,
  provider: 'OCI',
  deliveryModel: 'IaaS',
  neutral: {
    tags: unsupported('the agent applies no tags to it'),
  },
});
export const OciSubnet = defineOffer<
  'NetworkAndCompute.Subnet',
  ContractConfig<typeof NetworkAndCompute_IaaS_OciSubnet, 'cidrBlock'>
>({
  satisfies: 'NetworkAndCompute.Subnet',
  contract: NetworkAndCompute_IaaS_OciSubnet,
  provider: 'OCI',
  deliveryModel: 'IaaS',
});
export const OciSecurityList = defineOffer<
  'NetworkAndCompute.SecurityGroup',
  ContractConfig<
    typeof NetworkAndCompute_IaaS_OciSecurityList,
    'ingressRules' | 'egressRules'
  >
>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  contract: NetworkAndCompute_IaaS_OciSecurityList,
  provider: 'OCI',
  deliveryModel: 'IaaS',
});
export const OciInstance = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  ContractConfig<
    typeof NetworkAndCompute_IaaS_OciInstance,
    'keyName',
    {
      identity?: VmIdentity;
    }
  >
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  contract: NetworkAndCompute_IaaS_OciInstance,
  provider: 'OCI',
  deliveryModel: 'IaaS',
  neutral: {
    osType: unsupported('the operating system follows imageId'),
    size: toContractKey(NetworkAndCompute_IaaS_OciInstance, 'shape', ociShape),
    tags: unsupported('the agent applies no tags to it'),
  },
  // The OCI agent reads the authorized public key under `keyName` and writes it
  // to the instance's `ssh_authorized_keys` metadata.
  instantiate: instantiateWithVendorParameters(
    NetworkAndCompute_IaaS_OciInstance.offerType,
    'OCI',
    'IaaS',
    renameParameter(
      'publicSSHKey',
      contractKey(NetworkAndCompute_IaaS_OciInstance, 'keyName'),
    ),
  ),
});

// ── Hetzner ──────────────────────────────────────────────────────────────────
// Emitted for aria-agent-hetzner. Hetzner networks and firewalls are global and a
// subnet is placed by `networkZone`, so only the server has a location.
export const HetznerNetwork = defineOffer<
  'NetworkAndCompute.VirtualNetwork',
  {
    /**
     * @deprecated Hetzner has no location for this resource, so `region` is not
     * sent to the agent. Kept so existing callers still compile.
     */
    region?: string;
  }
>({
  satisfies: 'NetworkAndCompute.VirtualNetwork',
  offerType: 'NetworkAndCompute.IaaS.HetznerNetwork',
  provider: 'Hetzner',
  deliveryModel: 'IaaS',
  // The agent reads the network range as `ipRange`.
  instantiate: instantiateWithVendorParameters(
    'NetworkAndCompute.IaaS.HetznerNetwork',
    'Hetzner',
    'IaaS',
    composeVendorParameters(
      renameParameter('cidrBlock', 'ipRange'),
      dropParameter('region'),
    ),
  ),
});
export const HetznerSubnet = defineOffer<
  'NetworkAndCompute.Subnet',
  {
    /**
     * @deprecated Hetzner has no location for this resource, so `region` is not
     * sent to the agent. Kept so existing callers still compile.
     */
    region?: string;
    networkZone?: string;
  }
>({
  satisfies: 'NetworkAndCompute.Subnet',
  offerType: 'NetworkAndCompute.IaaS.HetznerSubnet',
  provider: 'Hetzner',
  deliveryModel: 'IaaS',
  instantiate: instantiateWithVendorParameters(
    'NetworkAndCompute.IaaS.HetznerSubnet',
    'Hetzner',
    'IaaS',
    dropParameter('region'),
  ),
});
export const HetznerFirewall = defineOffer<
  'NetworkAndCompute.SecurityGroup',
  {
    /**
     * @deprecated Hetzner has no location for this resource, so `region` is not
     * sent to the agent. Kept so existing callers still compile.
     */
    region?: string;
  }
>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  offerType: 'NetworkAndCompute.IaaS.HetznerFirewall',
  provider: 'Hetzner',
  deliveryModel: 'IaaS',
  instantiate: instantiateWithVendorParameters(
    'NetworkAndCompute.IaaS.HetznerFirewall',
    'Hetzner',
    'IaaS',
    composeVendorParameters(toHetznerEgressRules, dropParameter('region')),
  ),
});
/**
 * A Hetzner Cloud server, reconciled by aria-agent-hetzner as
 * `NetworkAndCompute.IaaS.HetznerCloudServer`. `region` is the Hetzner location
 * (`fsn1`, `nbg1`, `hel1`, `ash`, `hil`, `sin`) and is sent as `location`; unset,
 * the agent's configured default location applies.
 */
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
  offerType: 'NetworkAndCompute.IaaS.HetznerCloudServer',
  provider: 'Hetzner',
  deliveryModel: 'IaaS',
  instantiate: instantiateWithVendorParameters(
    'NetworkAndCompute.IaaS.HetznerCloudServer',
    'Hetzner',
    'IaaS',
    renameParameter('region', 'location'),
  ),
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
/**
 * A neutral rule list in aria-agent-openshift's shape: a JSON-encoded string
 * (the contract types the rules as `string`). A neutral rule names its peer
 * `sourceCidr` whichever direction it faces; the agent's egress rule names it
 * `destCidr`.
 */
const toOpenshiftPolicyRules: VendorParameters = (_componentId, parameters) => {
  const encode = (rules: unknown, peer: 'sourceCidr' | 'destCidr') =>
    Array.isArray(rules)
      ? JSON.stringify(
          rules.map(rule => {
            if (typeof rule !== 'object' || rule === null) {
              return rule;
            }
            const {sourceCidr, ...rest} = rule as Record<string, unknown>;
            return sourceCidr === undefined
              ? rest
              : {...rest, [peer]: sourceCidr};
          }),
        )
      : rules;
  return {
    ...parameters,
    ...('ingressRules' in parameters
      ? {ingressRules: encode(parameters.ingressRules, 'sourceCidr')}
      : {}),
    ...('egressRules' in parameters
      ? {egressRules: encode(parameters.egressRules, 'destCidr')}
      : {}),
  };
};

/** A Kubernetes NetworkPolicy. */
export const OpenshiftSecurityGroup = defineOffer<
  'NetworkAndCompute.SecurityGroup',
  ContractConfig<
    typeof NetworkAndCompute_CaaS_OpenshiftSecurityGroup,
    // Filled from the neutral withIngressRules / withEgressRules.
    'ingressRules' | 'egressRules'
  >
>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  contract: NetworkAndCompute_CaaS_OpenshiftSecurityGroup,
  provider: 'RedHat',
  deliveryModel: 'CaaS',
  instantiate: instantiateWithVendorParameters(
    NetworkAndCompute_CaaS_OpenshiftSecurityGroup.offerType,
    'RedHat',
    'CaaS',
    toOpenshiftPolicyRules,
  ),
});

/**
 * A MetalLB `IPAddressPool` (with its `L2Advertisement` or
 * `BGPAdvertisement`): the Subnet an `OpenshiftService` load balancer takes
 * its address from. `addresses` are CIDRs (`10.0.0.0/28`) or ranges
 * (`10.0.0.10-10.0.0.20`); the neutral `withCidrBlock` becomes the one CIDR of
 * the pool. One of the two is needed.
 */
export const OpenshiftIpAddressPool = defineOffer<
  'NetworkAndCompute.Subnet',
  ContractConfig<
    typeof NetworkAndCompute_CaaS_OpenshiftIpAddressPool,
    never,
    {addresses?: readonly string[]}
  >
>({
  satisfies: 'NetworkAndCompute.Subnet',
  contract: NetworkAndCompute_CaaS_OpenshiftIpAddressPool,
  provider: 'RedHat',
  deliveryModel: 'CaaS',
  neutral: {
    cidrBlock: toContractKey(
      NetworkAndCompute_CaaS_OpenshiftIpAddressPool,
      'addresses',
      cidr => [cidr],
    ),
  },
  validate: self => {
    const addresses = self.parameters.addresses;
    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw new Error(
        `Subnet '${self.id}' (${NetworkAndCompute_CaaS_OpenshiftIpAddressPool.offerType}) ` +
          'has no addresses: the load balancers using it take their address from them. ' +
          "Set OpenshiftIpAddressPool({addresses: [...]}) or the Subnet's withCidrBlock.",
      );
    }
  },
});

/**
 * Only a `LoadBalancer` Service takes an address, and on OpenShift it takes it
 * from exactly one MetalLB IP address pool: aria-agent-openshift refuses one
 * without a pool, or with two, and reads no other subnet. A ClusterIP or
 * NodePort Service (the agent's default is ClusterIP) resolves no pool, so a
 * subnet it declares would do nothing and is refused.
 */
const requireOpenshiftServiceSubnets = (
  self: {
    id: string;
    dependencies: readonly string[];
    parameters: Readonly<Record<string, unknown>>;
  },
  all: readonly {id: string; type: string}[],
): void => {
  const poolType = NetworkAndCompute_CaaS_OpenshiftIpAddressPool.offerType;
  // Every Subnet offer of the catalogue: a dependency of one of these types is
  // a subnet the load balancer declares; any other is a dependsOn peer.
  const subnetTypes = new Set(
    [
      AwsSubnet,
      AzureSubnet,
      GcpSubnet,
      OciSubnet,
      HetznerSubnet,
      VsphereVlan,
      OpenshiftIpAddressPool,
    ].map(o => o.offerType),
  );
  const subnets = self.dependencies
    .map(d => all.find(c => c.id === d))
    .filter(
      (c): c is {id: string; type: string} =>
        c !== undefined && subnetTypes.has(c.type),
    );
  const serviceType = self.parameters.serviceType ?? 'ClusterIP';
  if (serviceType !== 'LoadBalancer') {
    if (subnets.length > 0) {
      const [first] = subnets;
      throw new Error(
        `LoadBalancer '${self.id}' is a ${String(serviceType)} Service, which takes no ` +
          `address from a subnet, but declares subnet '${first.id}' (${first.type}). ` +
          'Fix: remove the subnet from LoadBalancer({subnets}), or select ' +
          "OpenshiftService({serviceType: 'LoadBalancer'}).",
      );
    }
    return;
  }
  const pools = subnets.filter(c => c.type === poolType);
  if (pools.length === 0) {
    throw new Error(
      `LoadBalancer '${self.id}' has no ${poolType} dependency: a load balancer is ` +
        'placed only in the subnets it declares. Declare it with ' +
        `LoadBalancer({subnets: [...]}) and select ${poolType} for it.`,
    );
  }
  if (pools.length > 1) {
    throw new Error(
      `LoadBalancer '${self.id}' depends on ${pools.length} ${poolType} components ` +
        `(${pools.map(p => p.id).join(', ')}), but takes its address from exactly one: keep one.`,
    );
  }
  const foreign = subnets.filter(c => c.type !== poolType);
  if (foreign.length > 0) {
    const [first] = foreign;
    throw new Error(
      `LoadBalancer '${self.id}' declares subnet '${first.id}' (${first.type}), which ` +
        `aria-agent-openshift does not read: select ${poolType} for it.`,
    );
  }
};

/**
 * A Kubernetes Service (ClusterIP, NodePort or LoadBalancer) and, with
 * `createRoute`, an OpenShift Route. Only as a `LoadBalancer` does it take an
 * address, from the one `OpenshiftIpAddressPool` it declares as its subnet; a
 * ClusterIP or NodePort Service declares none.
 */
export const OpenshiftService = defineOffer<
  'NetworkAndCompute.LoadBalancer',
  ContractConfig<typeof NetworkAndCompute_CaaS_OpenshiftService>
>({
  satisfies: 'NetworkAndCompute.LoadBalancer',
  contract: NetworkAndCompute_CaaS_OpenshiftService,
  provider: 'RedHat',
  deliveryModel: 'CaaS',
  neutral: {
    scheme: unsupported(
      'the address comes from the IP address pool the Service depends on',
    ),
  },
  validate: requireOpenshiftServiceSubnets,
});
