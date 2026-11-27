/**
 * The high-availability layout a managed service runs with: how many replicas
 * (brokers, nodes, servers, database instances) it keeps, and whether they must
 * be spread over the cluster's zones. Set with `.withHaLayout(...)`, a
 * guardrail. Each offer translates it for its agent or refuses it; an agent
 * that cannot honor the replica count or the spreading never receives it.
 */
export type HaLayout = {
  /** Replicas of the service. What a replica is depends on the service. */
  replicas: number;
  /**
   * `true`: the replicas must be spread over the cluster's zones, so the
   * service survives the loss of one. `false` or absent: no requirement.
   */
  spreadZones?: boolean;
};
