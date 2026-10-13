import type {APIManagement_CaaS_TraefikGateway} from './generated/api_management';
import type {ContractConfig} from './contract/contract_config';

/**
 * Vendor knobs of the `TraefikGateway` offer (`APIManagement.CaaS.TraefikGateway`):
 * the caas-k8s agent's published contract, with its comma-separated string
 * lists presented as lists (the offer joins them as the agent reads them).
 *
 * The DNS zones the gateway may write in are the component's
 * (`ApiGateway.withDnsZones`), so they are not a config key here.
 */
export type TraefikGatewayConfig = ContractConfig<
  typeof APIManagement_CaaS_TraefikGateway,
  'dnsZones',
  {
    /**
     * ACME account email of the gateway's own certificate issuer; optional.
     * The gateway issues its own certificate (ACME DNS-01, through cert-manager
     * it runs on the cluster) when it has TLS hosts (`tlsHosts`, or `host`), no
     * `tlsSecretName`, and its component's `dnsZones` grant it TXT write on the
     * zone of at least one host. The certificate names the covered hosts only.
     */
    acmeEmail?: string;
    /**
     * ACME directory of that issuer: `production` (the agent default),
     * `staging` (Let's Encrypt's directories), or an `https://` directory URL.
     */
    acmeServer?: 'production' | 'staging' | `https://${string}`;
    /**
     * @deprecated Ignored by the agent, which warns (`TlsClusterIssuerIgnored`):
     * the gateway issues its own certificate. Give its component `dnsZones` with
     * TXT write on the zone of its hosts (`ApiGateway.withDnsZones`) and set
     * `acmeEmail`. A gateway that served TLS from this issuer keeps serving that
     * certificate until its own is issued.
     */
    tlsClusterIssuer?: string;
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
