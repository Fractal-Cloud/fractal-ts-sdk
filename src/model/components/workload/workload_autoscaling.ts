/**
 * Horizontal autoscaling on CPU (a HorizontalPodAutoscaler on Kubernetes).
 * The autoscaler then owns the replica count.
 */
export type WorkloadAutoscaling = {
  /** Defaults to the workload's `replicas`. */
  minReplicas?: number;
  maxReplicas: number;
  /** Average CPU utilization to hold, in percent of the request. */
  targetCpuUtilization?: number;
};
