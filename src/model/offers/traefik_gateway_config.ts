/**
 * Vendor knobs of the `TraefikGateway` offer (`APIManagement.CaaS.TraefikGateway`),
 * under the keys the caas-k8s agent declares in its catalog `Config`. Lists are
 * sent comma-separated, as the agent reads them.
 */
export type TraefikGatewayConfig = {
  /** Default `traefik`. */
  namespace?: string;
  /** Default 2. */
  replicas?: number;
  /** Traefik Helm chart version; the agent defaults to 39.0.9 (Traefik v3.6.15). */
  chartVersion?: string;
  /** Host a route matches when it names none, e.g. `api.fractal.cloud`. */
  host?: string;
  /** An internal NLB (EKS Auto Mode load balancer class); default true. */
  internalLoadBalancer?: boolean;
  /**
   * Regional ACM certificate for a TLS listener on 443 of the NLB. NOT for a
   * gateway behind a CloudFront VPC origin: a VPC origin cannot reach an NLB
   * with a TLS listener, so that NLB stays TCP-only and the combination is
   * refused. Excludes Traefik TLS (`tlsSecretName` / `tlsClusterIssuer`): both
   * need port 443.
   */
  tlsCertificateArn?: string;
  /**
   * Traefik TLS from cert-manager: the ClusterIssuer (e.g. a `CertManager`
   * offer's `clusterIssuerName`, `letsencrypt` by default) the gateway requests
   * its own Certificate `traefik-tls` from, for `tlsHosts`, written to
   * `tlsSecretName`. The NLB stays TCP: 443 passes through to Traefik's
   * `websecure`, which terminates TLS.
   */
  tlsClusterIssuer?: string;
  /**
   * Traefik TLS: the kubernetes.io/tls Secret in the gateway namespace served
   * on `websecure`. Defaults to `traefik-tls` with `tlsClusterIssuer`; set alone,
   * it is an operator-provided certificate. TLS is on iff this (explicit or
   * defaulted) is set.
   */
  tlsSecretName?: string;
  /**
   * Hosts the certificate covers: exact names or `*.one-label` wildcards;
   * defaults to `host`. Must cover `host`, every route host, and every viewer
   * host CloudFront forwards. Only with TLS. The SDK checks `host` only; the
   * agent refuses a route whose host is not covered.
   */
  tlsHosts?: readonly string[];
  /**
   * Expose `web` (80) and serve the routes on it too. Default true without TLS,
   * false with TLS; false without TLS is refused. To move a gateway to TLS,
   * enable TLS with `plainHttp: true`, switch CloudFront `originProtocol` to
   * `https`, then drop `plainHttp`.
   */
  plainHttp?: boolean;
  /**
   * Idle timeout of the entry points; default 75. Must exceed the keep-alive
   * of whatever is in front (CloudFront's origin keep-alive).
   */
  entryPointIdleTimeoutSeconds?: number;
  /** CIDRs allowed to reach the load balancer (`spec.loadBalancerSourceRanges`). */
  loadBalancerSourceRanges?: readonly string[];
  /**
   * A ForwardAuth middleware on every route the workload links create (except
   * those of `forwardAuthExemptComponentIds`): each request is first sent to
   * this URL, with its method preserved, and is refused unless it answers 2xx.
   */
  forwardAuthAddress?: string;
  /** Request headers sent to the auth service; default authorization, cookie, x-clientid, x-clientsecret, origin. */
  forwardAuthRequestHeaders?: readonly string[];
  /** Auth-service response headers copied onto the request; default x-jwt. */
  forwardAuthResponseHeaders?: readonly string[];
  /** Send the request body to the auth service; default true. */
  forwardAuthForwardBody?: boolean;
  /** Largest body forwarded to the auth service, in bytes; default 1048576. */
  forwardAuthMaxBodySize?: number;
  /**
   * @deprecated Never applied to a workload's route any more: path prefixes no
   * longer exempt anything from ForwardAuth. The agent reserves it for routes it
   * writes for its own add-on backends (none exist yet). Exempt a workload with
   * `forwardAuthExemptComponentIds`.
   */
  forwardAuthExcludedPrefixes?: readonly string[];
  /**
   * Workloads whose own routes skip ForwardAuth; default `ocelot`. A bare
   * component id is a workload of the gateway's own Live System, otherwise
   * `<liveSystemId>/<componentId>`. Another workload routed under the same path
   * is still authenticated.
   */
  forwardAuthExemptComponentIds?: readonly string[];
  /** Chart values deep-merged over the agent's, for operators. */
  values?: Readonly<Record<string, unknown>>;
};
