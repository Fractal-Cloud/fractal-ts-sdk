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
   * Exporter image. Unset (the SDK sends nothing), the agent's pinned default
   * applies; the SDK deliberately does not repeat it, so a new agent default
   * (e.g. a multi-arch image) reaches existing Live Systems unchanged.
   */
  image?: string;
  /**
   * Pod nodeSelector, a non-empty label map. Unset (the SDK sends nothing), the
   * agent's default applies, matched to its default image. Set it together with
   * `image` when the image supports only some architectures.
   */
  nodeSelector?: Readonly<Record<string, string>>;
};
