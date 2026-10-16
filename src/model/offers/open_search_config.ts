/**
 * Vendor knobs of `StorageOpenSearch` (`Storage.CaaS.OpenSearch`, served by
 * aria-agent-caas-k8s). Hand-written until the agent publishes the offer in its
 * parameter contract; every key is optional and sent only when set.
 */
export type OpenSearchConfig = {
  /** Namespace of the release. Agent default `opensearch`. */
  namespace?: string;
  /** Number of OpenSearch nodes. Agent default `3`. */
  replicas?: number;
  /** Volume size of each node, a Kubernetes quantity. Agent default `100Gi`. */
  storage?: string;
  /** StorageClass of the node volumes; unset = resolved as for Grafana Loki. */
  storageClassName?: string;
  /** Container memory request and limit, a Kubernetes quantity (e.g. `4Gi`). */
  memory?: string;
  /** Container CPU, a Kubernetes quantity (e.g. `1` or `500m`). */
  cpu?: string;
  /** Also install OpenSearch Dashboards. Agent default `false`. */
  dashboards?: boolean;
  /** Chart values deep-merged over the agent's, for operators. */
  values?: Record<string, unknown>;
};
