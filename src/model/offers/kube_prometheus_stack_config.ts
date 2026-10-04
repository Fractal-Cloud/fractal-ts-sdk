/**
 * Vendor knobs of the `KubePrometheusStack` offer
 * (`Observability.CaaS.KubePrometheusStack`), under the keys the caas-k8s agent
 * declares in its catalog `Config`. The retention is the `Monitoring`
 * component's own `retentionDays` (`withRetentionDays`; the agent defaults to 15).
 */
export type KubePrometheusStackConfig = {
  /** Namespace of the release; the agent defaults to `monitoring`. */
  namespace?: string;
  /**
   * StorageClass of Prometheus' volume. Unset, the volume is ephemeral (EKS Auto
   * Mode has no default StorageClass).
   */
  storageClassName?: string;
  /** Size of Prometheus' volume in GiB, with `storageClassName`; the agent defaults to 50. */
  prometheusStorageGi?: number;
  /**
   * Grafana's Loki datasource. Unset: `http://loki.<namespace>.svc.cluster.local:3100`;
   * `none`: no Loki datasource.
   */
  lokiUrl?: string;
  /**
   * Grafana's Tempo datasource. Unset: `http://tempo.<namespace>.svc.cluster.local:3200`;
   * `none`: no Tempo datasource.
   */
  tempoUrl?: string;
  /** PrometheusRule specs by name (the chart's `additionalPrometheusRulesMap`); none by default. */
  alertRules?: Readonly<Record<string, unknown>>;
  /** Alertmanager configuration (route, receivers, webhooks); the chart's default otherwise. */
  alertmanagerConfig?: Readonly<Record<string, unknown>>;
  /** Chart values deep-merged over the agent's, for operators. */
  values?: Readonly<Record<string, unknown>>;
};
