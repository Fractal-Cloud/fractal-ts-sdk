/**
 * Vendor knobs of the `SqsExporter` offer (`Observability.CaaS.SqsExporter`),
 * under the keys the caas-k8s agent declares in its catalog `Config`.
 */
export type SqsExporterConfig = {
  /** Namespace of the exporter; the agent defaults to `monitoring`. */
  namespace?: string;
  /**
   * Queues watched besides the linked `AwsSqsQueue` components, as
   * `https://sqs.<region>.amazonaws.com/<account>/<name>` URLs. Sent
   * comma-separated.
   */
  queueUrls?: readonly string[];
  /** Seconds between two reads of the queue attributes; the agent defaults to 30. */
  monitorIntervalSeconds?: number;
  /**
   * Exporter image. The agent pins
   * `ghcr.io/jmriebold/sqs-prometheus-exporter:1.1.0@sha256:7564828a...`, which is
   * published for linux/amd64 only.
   */
  image?: string;
  /**
   * Pod nodeSelector; the agent defaults to `{"kubernetes.io/arch": "amd64"}`,
   * matching the default image. A Graviton-only cluster needs an arm64 `image`
   * and this overridden.
   */
  nodeSelector?: Readonly<Record<string, string>>;
};
