/** One path a gateway forwards to a workload (see `gatewayRouteSettings`). */
export type GatewayRoute = {
  /** Path prefix the gateway matches, e.g. `/accounts`. */
  prefix: string;
  /** Replace the whole request path with this one before forwarding. */
  rewritePath?: string;
  /** Host the route matches; defaults to the gateway's own `host`. */
  host?: string;
};
