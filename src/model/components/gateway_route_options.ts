import type {GatewayRoute} from './gateway_route';

/**
 * What a workload asks of the gateway it links to. Every timeout and retry
 * applies to all of the link's routes; omitted ones take the agent's defaults
 * (response 60000 ms, idle 10000 ms, 2 attempts, the workload's container port).
 */
export type GatewayRouteOptions = {
  routes: readonly GatewayRoute[];
  /** Time to wait for the response headers. */
  responseTimeoutMs?: number;
  /** How long an idle connection to the workload is kept open. */
  idleConnTimeoutMs?: number;
  /** Attempts before giving up on a connection failure; 0 is no retry. */
  retryAttempts?: number;
  /** Workload port the gateway forwards to. */
  servicePort?: number;
};
