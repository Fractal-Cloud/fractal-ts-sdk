import type {APIManagement_CaaS_TraefikGateway} from './generated/api_management';
import type {ContractConfig} from './contract/contract_config';

/**
 * Vendor knobs of the `TraefikGateway` offer (`APIManagement.CaaS.TraefikGateway`):
 * the caas-k8s agent's published contract, with its comma-separated string
 * lists presented as lists (the offer joins them as the agent reads them).
 */
export type TraefikGatewayConfig = ContractConfig<
  typeof APIManagement_CaaS_TraefikGateway,
  never,
  {
    /**
     * Hosts the certificate covers: exact names or `*.one-label` wildcards;
     * defaults to `host`. Must cover `host`, every route host, and every viewer
     * host CloudFront forwards. Only with TLS. The SDK checks `host` only; the
     * agent refuses a route whose host is not covered.
     */
    tlsHosts?: readonly string[];
    /** CIDRs allowed to reach the load balancer (`spec.loadBalancerSourceRanges`). */
    loadBalancerSourceRanges?: readonly string[];
    /** Request headers sent to the auth service; default authorization, cookie, x-clientid, x-clientsecret, origin. */
    forwardAuthRequestHeaders?: readonly string[];
    /** Auth-service response headers copied onto the request; default x-jwt. */
    forwardAuthResponseHeaders?: readonly string[];
    /**
     * Workloads whose own routes skip ForwardAuth; none by default. A bare
     * component id is a workload of the gateway's own Live System, otherwise
     * `<liveSystemId>/<componentId>`. Another workload routed under the same path
     * is still authenticated.
     */
    forwardAuthExemptComponentIds?: readonly string[];
  }
>;
