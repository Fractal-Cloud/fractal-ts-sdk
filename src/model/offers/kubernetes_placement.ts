/**
 * offers/kubernetes_placement.ts — where a component that runs on Kubernetes
 * finds its cluster, checked as the agents check it.
 *
 * A vendor-neutral CaaS offer (a Kubernetes workload, Traefik, Kafka, the
 * Grafana stack, ...) is installed on the cluster it depends on. The agents
 * resolve that cluster from the component's dependencies: the Java agents refuse
 * a component with more than one cluster dependency (they never guess), and
 * every agent fails a component no cluster is reachable from — the caas-k8s
 * agent also follows the dependencies of a dependency, which is how a Kafka
 * topic reaches its cluster through its Kafka. Internal.
 */
import type {LiveSystemComponent} from '../core';
import type {ComponentValidator} from './component_validator';
import {
  dependenciesOfType,
  reachableDependenciesOfType,
  refuseComponent,
} from './cross_component_rules';

/**
 * Every type the agents recognize as a Kubernetes cluster: the vendor offer
 * types this SDK emits, and the short and abstract spellings other producers
 * use.
 */
export const KUBERNETES_CLUSTER_TYPES: readonly string[] = [
  'NetworkAndCompute.PaaS.AwsEks',
  'NetworkAndCompute.PaaS.AzureAks',
  'NetworkAndCompute.PaaS.GcpGke',
  'NetworkAndCompute.PaaS.EKS',
  'NetworkAndCompute.PaaS.AKS',
  'NetworkAndCompute.PaaS.GKE',
  'NetworkAndCompute.PaaS.OKE',
  'NetworkAndCompute.PaaS.Kubernetes',
];

/** The cluster types that are Amazon EKS. */
export const EKS_CLUSTER_TYPES: readonly string[] = [
  'NetworkAndCompute.PaaS.AwsEks',
  'NetworkAndCompute.PaaS.EKS',
];

/** The cluster `self` is installed on, refusing none or an ambiguous choice. */
const clusterOf = (
  self: LiveSystemComponent,
  all: readonly LiveSystemComponent[],
): LiveSystemComponent => {
  const direct = dependenciesOfType(self, all, KUBERNETES_CLUSTER_TYPES);
  if (direct.length > 1) {
    refuseComponent(
      self,
      `depends on ${direct.length} Kubernetes clusters ` +
        `[${direct.map(c => c.id).join(', ')}]: it is installed on exactly one. ` +
        'Keep the dependency on the cluster it runs on',
    );
  }
  if (direct.length === 1) {
    return direct[0];
  }
  const reachable = reachableDependenciesOfType(
    self,
    all,
    KUBERNETES_CLUSTER_TYPES,
  );
  if (reachable.length === 0) {
    refuseComponent(
      self,
      'runs on Kubernetes but no Kubernetes cluster is among its dependencies. ' +
        'Add a ContainerPlatform component, select Eks, Aks or Gke for it, and ' +
        `make '${self.id}' depend on it`,
    );
  }
  return reachable[0];
};

/** `self` must be installable on exactly one Kubernetes cluster. */
export const onKubernetesCluster: ComponentValidator = (self, all) => {
  clusterOf(self, all);
};

/**
 * `self` must run on an Amazon EKS cluster: its agent grants it AWS access
 * through EKS Pod Identity, which no other cluster has.
 */
export const onEksCluster =
  (why: string): ComponentValidator =>
  (self, all) => {
    const cluster = clusterOf(self, all);
    if (!EKS_CLUSTER_TYPES.includes(cluster.type)) {
      refuseComponent(
        self,
        `runs on cluster '${cluster.id}' (${cluster.type}), but it needs an EKS ` +
          `cluster: ${why}. Make it depend on a ContainerPlatform with Eks selected`,
      );
    }
  };
