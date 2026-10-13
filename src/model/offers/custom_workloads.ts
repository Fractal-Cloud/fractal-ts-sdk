/**
 * offers/custom_workloads.ts — CustomWorkloads domain Offers (Catalogue, Level 3,
 * concrete).
 *
 * Each offer declares which Component it satisfies, its 3-part offer type, its
 * delivery model and (for cloud offers) its vendor. Vendor-neutral CaaS offers
 * OMIT `provider` — they run on any cluster and are identified by deliveryModel
 * + offerType. Vendor knobs live in each offer's config type.
 */
import {
  NetworkAndCompute_CaaS_CloudRunService,
  NetworkAndCompute_CaaS_ECSService,
  NetworkAndCompute_CaaS_ECSTaskDefinition,
  NetworkAndCompute_IaaS_AwsSubnet,
  NetworkAndCompute_PaaS_ECS,
} from './generated/network_and_compute';
import {
  cpuCores,
  ecsCpuUnits,
  ecsMemoryMiB,
  memoryGi,
} from './resource_quantities';
import {toContractKey, toContractKeys, unsupported} from './neutral_rules';
import {
  CustomWorkloads_CaaS_KubernetesWorkload,
  CustomWorkloads_FaaS_AwsLambda,
  CustomWorkloads_FaaS_AzureFunction,
  CustomWorkloads_FaaS_GcpFunction,
  CustomWorkloads_PaaS_AzureContainerApp,
} from './generated/custom_workloads';
import type {ContractConfig} from './contract/contract_config';
import {defineOffer} from '../core';
import {
  AZURE_CONTAINER_APPS_ENVIRONMENT_OFFER_TYPE,
  KUBERNETES_WORKLOAD_OFFER_TYPE,
} from './offer_type_ids';
import {toKubernetesWorkloadParameters} from './kubernetes_workload_contract';
import type {WorkloadSsmParameters} from './workload_ssm_parameters';
import {allOf, onlyFor, requireDependency} from './cross_component_rules';
import {onKubernetesCluster} from './kubernetes_placement';
import {workloadLinkEnvIsUnambiguous} from './workload_link_env';
import {computeTrafficLinks} from './network_and_compute';

const asRecord = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};

const requests = (v: unknown): Record<string, unknown> =>
  asRecord(asRecord(v).requests);

const unsupportedOnEcs = (what: string) =>
  unsupported(
    `the ECS task definition and service contracts declare no ${what}`,
  );
const unsupportedOnCloudRun = (what: string) =>
  unsupported(`the Cloud Run service contract declares no ${what}`);

// ── Workload offers ──────────────────────────────────────────────────────────
/**
 * An Amazon ECS service. One `Workload` becomes the two components the AWS
 * agent reconciles: an `NetworkAndCompute.CaaS.ECSTaskDefinition` with the id
 * `<id>-task`, carrying the container (image, port, CPU, memory), and the
 * `NetworkAndCompute.CaaS.ECSService` itself, which depends on it (a
 * live-system-only dependency, see the platform contract's "Live System
 * Sub-Component Dependencies"). The service also needs an ECS cluster: make
 * the Workload depend on a ContainerPlatform with `EcsCluster` selected, and on
 * a Subnet.
 */
export const EcsService = defineOffer<
  'CustomWorkloads.Workload',
  ContractConfig<typeof NetworkAndCompute_CaaS_ECSService, 'desiredCount'> &
    ContractConfig<
      typeof NetworkAndCompute_CaaS_ECSTaskDefinition,
      'containerImage' | 'containerPort' | 'cpu' | 'memory'
    >
>({
  satisfies: 'CustomWorkloads.Workload',
  contract: NetworkAndCompute_CaaS_ECSService,
  provider: 'AWS',
  deliveryModel: 'CaaS',
  neutral: {
    image: toContractKey(
      NetworkAndCompute_CaaS_ECSTaskDefinition,
      'containerImage',
    ),
    port: toContractKey(
      NetworkAndCompute_CaaS_ECSTaskDefinition,
      'containerPort',
    ),
    resources: toContractKeys(
      NetworkAndCompute_CaaS_ECSTaskDefinition,
      ['cpu', 'memory'],
      v => ({
        cpu:
          requests(v).cpu === undefined
            ? undefined
            : ecsCpuUnits(requests(v).cpu),
        memory:
          requests(v).memory === undefined
            ? undefined
            : ecsMemoryMiB(requests(v).memory),
      }),
    ),
    cpuRequest: toContractKey(
      NetworkAndCompute_CaaS_ECSTaskDefinition,
      'cpu',
      ecsCpuUnits,
    ),
    memoryRequest: toContractKey(
      NetworkAndCompute_CaaS_ECSTaskDefinition,
      'memory',
      ecsMemoryMiB,
    ),
    replicas: toContractKey(NetworkAndCompute_CaaS_ECSService, 'desiredCount'),
    autoscaling: unsupportedOnEcs('autoscaling'),
    maxReplicas: unsupportedOnEcs('autoscaling'),
    env: unsupportedOnEcs('container environment'),
    secretEnv: unsupportedOnEcs('container secrets'),
    healthCheck: unsupportedOnEcs('health check'),
    readinessProbe: unsupportedOnEcs('health check'),
    livenessProbe: unsupportedOnEcs('health check'),
    startupProbe: unsupportedOnEcs('health check'),
    maxSurge: unsupportedOnEcs('deployment rollout setting'),
    maxUnavailable: unsupportedOnEcs('deployment rollout setting'),
    nodeSelector: unsupportedOnEcs('node selector'),
    podDisruptionBudget: unsupportedOnEcs('disruption budget'),
    preStopSleepSeconds: unsupportedOnEcs('stop hook'),
    terminationGracePeriodSeconds: unsupportedOnEcs('stop timeout'),
    topologySpread: unsupportedOnEcs('placement spread'),
  },
  // The task definition is emitted beside the service and needs nothing else;
  // the service runs on an ECS cluster, in a subnet, both of which it declares.
  validate: onlyFor(
    [NetworkAndCompute_CaaS_ECSService.offerType],
    allOf(
      requireDependency({
        types: [NetworkAndCompute_PaaS_ECS.offerType],
        why: 'an ECS service runs on the ECS cluster it declares',
        remedy:
          'Make the Workload depend on a ContainerPlatform component and select EcsCluster for it.',
      }),
      requireDependency({
        types: [NetworkAndCompute_IaaS_AwsSubnet.offerType],
        why: 'an ECS service places its tasks only in the subnet it declares',
        remedy:
          'Make the Workload depend on a Subnet component and select AwsSubnet for it.',
      }),
      computeTrafficLinks,
    ),
  ),
  instantiate: (ctx, config) => {
    const task = NetworkAndCompute_CaaS_ECSTaskDefinition;
    const service = NetworkAndCompute_CaaS_ECSService;
    const all: Record<string, unknown> = {...ctx.parameters, ...config};
    const taskParameters = Object.fromEntries(
      Object.entries(all).filter(([k]) => k in task.params),
    );
    // Everything that is not a task-definition key goes to the service, so a
    // key neither contract declares is still visible on the emitted component.
    const serviceParameters = Object.fromEntries(
      Object.entries(all).filter(
        ([k]) => k in service.params || !(k in task.params),
      ),
    );
    const taskId = `${ctx.id}-task`;
    return [
      {
        id: taskId,
        displayName: `${ctx.displayName} task definition`,
        type: task.offerType,
        provider: 'AWS',
        deliveryModel: 'CaaS',
        parameters: taskParameters,
        dependencies: [],
        links: [],
      },
      {
        id: ctx.id,
        displayName: ctx.displayName,
        type: service.offerType,
        provider: 'AWS',
        deliveryModel: 'CaaS',
        parameters: serviceParameters,
        dependencies: [...ctx.dependencies, taskId],
        links: ctx.links,
      },
    ];
  },
});
/** A Google Cloud Run service (`NetworkAndCompute.CaaS.CloudRunService`). */
export const CloudRun = defineOffer<
  'CustomWorkloads.Workload',
  ContractConfig<
    typeof NetworkAndCompute_CaaS_CloudRunService,
    // Filled by the Workload's withImage / withPort.
    'image' | 'port'
  >
>({
  satisfies: 'CustomWorkloads.Workload',
  contract: NetworkAndCompute_CaaS_CloudRunService,
  provider: 'GCP',
  deliveryModel: 'CaaS',
  neutral: {
    resources: toContractKeys(
      NetworkAndCompute_CaaS_CloudRunService,
      ['cpu', 'memory'],
      v => ({cpu: requests(v).cpu, memory: requests(v).memory}),
    ),
    cpuRequest: toContractKey(NetworkAndCompute_CaaS_CloudRunService, 'cpu'),
    memoryRequest: toContractKey(
      NetworkAndCompute_CaaS_CloudRunService,
      'memory',
    ),
    autoscaling: toContractKeys(
      NetworkAndCompute_CaaS_CloudRunService,
      ['minInstances', 'maxInstances'],
      v => ({
        minInstances: asRecord(v).minReplicas,
        maxInstances: asRecord(v).maxReplicas,
      }),
    ),
    replicas: toContractKeys(
      NetworkAndCompute_CaaS_CloudRunService,
      ['minInstances', 'maxInstances'],
      v => ({minInstances: v, maxInstances: v}),
    ),
    maxReplicas: toContractKey(
      NetworkAndCompute_CaaS_CloudRunService,
      'maxInstances',
    ),
    env: unsupportedOnCloudRun('container environment'),
    secretEnv: unsupportedOnCloudRun('container secrets'),
    healthCheck: unsupportedOnCloudRun('health check'),
    readinessProbe: unsupportedOnCloudRun('health check'),
    livenessProbe: unsupportedOnCloudRun('health check'),
    startupProbe: unsupportedOnCloudRun('health check'),
    maxSurge: unsupportedOnCloudRun('deployment rollout setting'),
    maxUnavailable: unsupportedOnCloudRun('deployment rollout setting'),
    nodeSelector: unsupportedOnCloudRun('node selector'),
    podDisruptionBudget: unsupportedOnCloudRun('disruption budget'),
    preStopSleepSeconds: unsupportedOnCloudRun('stop hook'),
    terminationGracePeriodSeconds: unsupportedOnCloudRun('stop timeout'),
    topologySpread: unsupportedOnCloudRun('placement spread'),
  },
});
/**
 * A Container App runs INSIDE a managed environment, and the agent will not
 * create one implicitly: it resolves an `AzureContainerAppsEnvironment`
 * dependency by type and reads the provisioned `environmentId` off that peer's
 * output fields. A workload without one fails in the agent, mid-deployment,
 * with `has no AzureContainerAppsEnvironment dependency` — so the selection is
 * refused here instead, while the author is still looking at the blueprint.
 *
 * The dependency is matched on the emitted offer type rather than the component
 * id so it holds however the environment is named, and it is checked against the
 * emitted Live System rather than the blueprint because only the former knows
 * which offer a `ContainerPlatform` component was given.
 */
export const AzureContainerApp = defineOffer<
  'CustomWorkloads.Workload',
  ContractConfig<
    typeof CustomWorkloads_PaaS_AzureContainerApp,
    'image' | 'maxReplicas' | 'port',
    {resourceGroup: string}
  >
>({
  satisfies: 'CustomWorkloads.Workload',
  contract: CustomWorkloads_PaaS_AzureContainerApp,
  provider: 'Azure',
  deliveryModel: 'PaaS',
  neutral: {
    autoscaling: toContractKeys(
      CustomWorkloads_PaaS_AzureContainerApp,
      ['minReplicas', 'maxReplicas'],
      v => ({
        minReplicas: asRecord(v).minReplicas,
        maxReplicas: asRecord(v).maxReplicas,
      }),
    ),
    cpuRequest: toContractKey(
      CustomWorkloads_PaaS_AzureContainerApp,
      'cpu',
      cpuCores,
    ),
    env: unsupported('the agent declares no such Container App setting'),
    healthCheck: unsupported(
      'the agent declares no such Container App setting',
    ),
    livenessProbe: unsupported(
      'the agent declares no such Container App setting',
    ),
    maxSurge: unsupported('the agent declares no such Container App setting'),
    maxUnavailable: unsupported(
      'the agent declares no such Container App setting',
    ),
    memoryRequest: toContractKey(
      CustomWorkloads_PaaS_AzureContainerApp,
      'memory',
      memoryGi,
    ),
    nodeSelector: unsupported(
      'the agent declares no such Container App setting',
    ),
    podDisruptionBudget: unsupported(
      'the agent declares no such Container App setting',
    ),
    preStopSleepSeconds: unsupported(
      'the agent declares no such Container App setting',
    ),
    readinessProbe: unsupported(
      'the agent declares no such Container App setting',
    ),
    replicas: toContractKeys(
      CustomWorkloads_PaaS_AzureContainerApp,
      ['minReplicas', 'maxReplicas'],
      v => ({minReplicas: v, maxReplicas: v}),
    ),
    resources: toContractKeys(
      CustomWorkloads_PaaS_AzureContainerApp,
      ['cpu', 'memory'],
      v => ({
        cpu:
          requests(v).cpu === undefined ? undefined : cpuCores(requests(v).cpu),
        memory:
          requests(v).memory === undefined
            ? undefined
            : memoryGi(requests(v).memory),
      }),
    ),
    secretEnv: unsupported('the agent declares no such Container App setting'),
    startupProbe: unsupported(
      'the agent declares no such Container App setting',
    ),
    terminationGracePeriodSeconds: unsupported(
      'the agent declares no such Container App setting',
    ),
    topologySpread: unsupported(
      'the agent declares no such Container App setting',
    ),
  },
  validate: (self, all) => {
    const hasEnvironment = all.some(
      c =>
        self.dependencies.includes(c.id) &&
        c.type === AZURE_CONTAINER_APPS_ENVIRONMENT_OFFER_TYPE,
    );
    if (!hasEnvironment) {
      throw new Error(
        `AzureContainerApp '${self.id}' has no ${AZURE_CONTAINER_APPS_ENVIRONMENT_OFFER_TYPE} ` +
          'dependency. An Azure Container App can only run inside a managed ' +
          'environment: add a ContainerPlatform component to the blueprint, ' +
          `select AzureContainerAppsEnvironment for it, and make '${self.id}' ` +
          'depend on it.',
      );
    }
  },
});
export const OpenshiftWorkload = defineOffer<
  'CustomWorkloads.Workload',
  {namespace?: string}
>({
  satisfies: 'CustomWorkloads.Workload',
  offerType: 'CustomWorkloads.CaaS.OpenshiftWorkload',
  provider: 'RedHat',
  deliveryModel: 'CaaS',
});
/**
 * Vendor-neutral: runs on any Kubernetes cluster, so `provider` is omitted.
 *
 * The neutral `Workload` component records a container image under `image`.
 * The offers that satisfy this component read the image under different
 * names: `OpenshiftWorkload`, `AzureContainerApp` and `CloudRun` read `image`,
 * `EcsService` sends it to its task definition as `containerImage`, and so
 * does this offer, for the caas-k8s agent. Each offer translates to its own
 * agent's key; renaming the neutral parameter would break the others.
 *
 * Emitting `image` was a silent data loss, not a visible error: the parameter
 * contract prunes names it does not declare, so the value never reached the
 * agent, `containerImage` arrived empty and the handler correctly refused the
 * component with `containerImage is required when manifestUri is not set`.
 *
 * A `Workload` added as a CHILD of a ContainerPlatform never reaches this
 * `instantiate` — see `toKubernetesWorkloadParameters`, which both paths share.
 *
 * `ssmParameters` and `sesIdentityArns` are AWS grants on the workload's Pod
 * Identity role, so they apply only on EKS (caas-k8s v1.4.0): Parameter Store
 * access under `/fractal/<service>`, and sending email as the listed SES
 * identities (e.g. an `AwsSesIdentity`'s ARN).
 */
export const K8sWorkload = defineOffer<
  'CustomWorkloads.Workload',
  ContractConfig<
    typeof CustomWorkloads_CaaS_KubernetesWorkload,
    | 'autoscaling'
    | 'cpuRequest'
    | 'env'
    | 'healthCheck'
    | 'livenessProbe'
    | 'maxReplicas'
    | 'maxSurge'
    | 'memoryRequest'
    | 'nodeSelector'
    | 'podDisruptionBudget'
    | 'preStopSleepSeconds'
    | 'readinessProbe'
    | 'replicas'
    | 'secretEnv'
    | 'startupProbe'
    | 'terminationGracePeriodSeconds'
    | 'topologySpread',
    {
      ssmParameters?: WorkloadSsmParameters;
      sesIdentityArns?: string[];
    }
  >
>({
  satisfies: 'CustomWorkloads.Workload',
  // Exported symbol name is public API and stays `K8sWorkload`; only the wire
  // value is pinned to the id the catalogue and the caas-k8s agent agree on.
  contract: CustomWorkloads_CaaS_KubernetesWorkload,
  deliveryModel: 'CaaS',
  validate: allOf(onKubernetesCluster, workloadLinkEnvIsUnambiguous),
  instantiate: (ctx, cfg) => [
    {
      id: ctx.id,
      displayName: ctx.displayName,
      type: KUBERNETES_WORKLOAD_OFFER_TYPE,
      // `provider` is deliberately absent: this offer is vendor-neutral. If one
      // is ever added to the spec above it must be added here too — a custom
      // `instantiate` does not inherit the default path's `provider`.
      deliveryModel: 'CaaS',
      parameters: toKubernetesWorkloadParameters(
        {...ctx.parameters, ...cfg},
        ctx.id,
        ctx.locked ?? [],
      ),
      dependencies: ctx.dependencies,
      links: ctx.links,
    },
  ],
});

// ── Function offers ──────────────────────────────────────────────────────────
export const AwsLambda = defineOffer<
  'CustomWorkloads.Function',
  ContractConfig<
    typeof CustomWorkloads_FaaS_AwsLambda,
    'environment' | 'runtime' | 'sourceArtifact',
    {roleArn: string; handler: string}
  >
>({
  satisfies: 'CustomWorkloads.Function',
  contract: CustomWorkloads_FaaS_AwsLambda,
  provider: 'AWS',
  deliveryModel: 'FaaS',
  neutral: {
    concurrency: unsupported('the agent sets no concurrency limit'),
    memory: toContractKey(CustomWorkloads_FaaS_AwsLambda, 'memoryMb'),
    timeout: toContractKey(CustomWorkloads_FaaS_AwsLambda, 'timeoutSeconds'),
  },
});
export const AzureFunction = defineOffer<
  'CustomWorkloads.Function',
  ContractConfig<typeof CustomWorkloads_FaaS_AzureFunction, 'sourceArtifact'>
>({
  satisfies: 'CustomWorkloads.Function',
  contract: CustomWorkloads_FaaS_AzureFunction,
  provider: 'Azure',
  deliveryModel: 'FaaS',
  neutral: {
    concurrency: unsupported('the agent declares no such Function setting'),
    environment: toContractKey(
      CustomWorkloads_FaaS_AzureFunction,
      'appSettings',
    ),
    memory: unsupported('the agent declares no such Function setting'),
    runtime: unsupported('the agent declares no such Function setting'),
    timeout: unsupported('the agent declares no such Function setting'),
  },
});
export const GcpFunction = defineOffer<
  'CustomWorkloads.Function',
  ContractConfig<
    typeof CustomWorkloads_FaaS_GcpFunction,
    'runtime' | 'sourceArtifact'
  >
>({
  satisfies: 'CustomWorkloads.Function',
  contract: CustomWorkloads_FaaS_GcpFunction,
  provider: 'GCP',
  deliveryModel: 'FaaS',
  neutral: {
    concurrency: unsupported('the agent declares no such Function setting'),
    environment: unsupported('the agent declares no such Function setting'),
    memory: unsupported('the agent declares no such Function setting'),
    timeout: unsupported('the agent declares no such Function setting'),
  },
});
