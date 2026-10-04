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
   * Exporter image with the exporter as its entrypoint. Unset (the SDK sends
   * nothing): the agent's own multi-arch (amd64 and arm64) release image, run
   * as `sqs-exporter`. That image is private on Docker Hub: give the namespace a
   * pull secret (`imagePullSecrets`) or set this to a mirror.
   */
  image?: string;
  /** Secrets in the namespace to pull the image with. Sent comma-separated. */
  imagePullSecrets?: readonly string[];
  /** Pod nodeSelector, a non-empty label map. Unset: none. */
  nodeSelector?: Readonly<Record<string, string>>;
};
