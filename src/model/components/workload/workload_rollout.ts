/**
 * Rolling-update pace: replicas started above (`maxSurge`) and taken below
 * (`maxUnavailable`) the desired count while a new version rolls out. The agent
 * defaults to a surge rollout, `maxSurge: 1` and `maxUnavailable: 0`.
 */
export type WorkloadRollout = {
  /** A count, or a percentage of the desired count such as `'25%'`. */
  maxSurge?: number | `${number}%`;
  /** A count, or a percentage of the desired count such as `'0%'`. */
  maxUnavailable?: number | `${number}%`;
};
