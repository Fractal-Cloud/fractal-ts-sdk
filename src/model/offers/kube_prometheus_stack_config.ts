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
   * StorageClass of Prometheus' volume. Unset on EKS: `fractal-gp3`, which the agent creates
   * when absent (encrypted gp3, EKS Auto Mode's EBS CSI driver,
   * WaitForFirstConsumer), if that CSI driver exists; otherwise the volume is
   * ephemeral, so set it on EKS without Auto Mode. The class chosen is
   * published as the `storageClassName` output and kept: a release installed
   * earlier without that output stays ephemeral.
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
