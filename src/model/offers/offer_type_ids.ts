/**
 * Offer type ids that more than one offer module has to agree on, taken from
 * the agents' published contracts (offers/generated/).
 *
 * These strings are a wire contract: the platform catalogue publishes them and
 * the agent that claims the component keys its handler registry on them with a
 * plain map lookup. A component whose type matches no registered handler is
 * skipped in silence — it never deploys and the Live System never settles. The
 * ids live here, once, because a literal duplicated across offer modules is how
 * half a rename ships: one file changes and the other keeps the old value.
 *
 * Not re-exported from the model barrel — these are internal, not public API.
 */
import {APIManagement_CaaS_TraefikGateway} from './generated/api_management';
import {CustomWorkloads_CaaS_KubernetesWorkload} from './generated/custom_workloads';
import {NetworkAndCompute_PaaS_AzureContainerAppsEnvironment} from './generated/network_and_compute';

export const KUBERNETES_WORKLOAD_OFFER_TYPE =
  CustomWorkloads_CaaS_KubernetesWorkload.offerType;

/**
 * The managed environment an `AzureContainerApp` runs in. Two offer modules name
 * it: the offer itself lives in `network_and_compute.ts` (it satisfies
 * `NetworkAndCompute.ContainerPlatform`, which is where the catalogue files it),
 * while the workload that REQUIRES one as a dependency lives in
 * `custom_workloads.ts` and refuses a Live System without it.
 *
 * The agent matches this dependency on the full 3-part string, case-insensitively
 * (`LiveSystem.getDependenciesByTypes`), and dispatches on the third segment alone
 * within the PaaS tier (`AzureNetworkAndComputeInstantiatorStrategy`). Both
 * segments must therefore stay exactly as written here.
 */
export const AZURE_CONTAINER_APPS_ENVIRONMENT_OFFER_TYPE =
  NetworkAndCompute_PaaS_AzureContainerAppsEnvironment.offerType;

/**
 * The caas-k8s Traefik gateway. Two offer modules name it: the offer lives in
 * `api_management.ts`, and `KubePrometheusStack` (`observability.ts`) checks the
 * Grafana route link it may carry to one.
 */
export const TRAEFIK_GATEWAY_OFFER_TYPE =
  APIManagement_CaaS_TraefikGateway.offerType;
