/**
 * Vendor knobs of `GrafanaAlloy` (`Observability.CaaS.GrafanaAlloy`), under the
 * keys the caas-k8s agent declares in its catalog `Config`.
 */
export type GrafanaAlloyConfig = {
  /** Namespace of the DaemonSet; the agent defaults to `monitoring`. */
  namespace?: string;
  /**
   * Loki push URL. Unset, Alloy ships to the `pushUrl` of the `GrafanaLoki`
   * component it depends on, and refuses to install without one.
   */
  lokiPushUrl?: string;
  /** Chart values deep-merged over the agent's, for operators. */
  values?: Readonly<Record<string, unknown>>;
};
