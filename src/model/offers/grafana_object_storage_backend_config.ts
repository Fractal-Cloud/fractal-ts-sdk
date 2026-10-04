/**
 * Vendor knobs of `GrafanaLoki` (`Observability.CaaS.GrafanaLoki`) and
 * `GrafanaTempo` (`Observability.CaaS.GrafanaTempo`), under the keys the caas-k8s
 * agent declares in their catalog `Config`. The retention is the component's own
 * `retentionDays` (`withRetentionDays`; the agent defaults to 14 for Loki and 7
 * for Tempo). Their data lives in the one S3 bucket they link to with
 * `{access: 'read-write'}`.
 */
export type GrafanaObjectStorageBackendConfig = {
  /** Namespace of the release; the agent defaults to `monitoring`. */
  namespace?: string;
  /**
   * StorageClass of a volume for the write-ahead log. Unset on EKS: `fractal-gp3`, which the agent creates
   * when absent (encrypted gp3, EKS Auto Mode's EBS CSI driver,
   * WaitForFirstConsumer), if that CSI driver exists; otherwise the volume is
   * ephemeral, so set it on EKS without Auto Mode. The class chosen is
   * published as the `storageClassName` output and kept: a release installed
   * earlier without that output stays ephemeral.
   */
  storageClassName?: string;
  /** Chart values deep-merged over the agent's, for operators. */
  values?: Readonly<Record<string, unknown>>;
};
