/** An HTTP GET health probe. `port` defaults to the container port. */
export type WorkloadProbe = {
  path: string;
  port?: number;
  initialDelaySeconds?: number;
  periodSeconds?: number;
  timeoutSeconds?: number;
  failureThreshold?: number;
};
