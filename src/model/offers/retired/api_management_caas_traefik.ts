// The last contract an agent published for this offer type: fractal-cloud-agents
// v8.31.0. No agent declares it since fractal-cloud-agents v8.48.0, so the
// generator no longer emits it. Frozen here only so the deprecated offer keeps
// its config type and key names; nothing checks parameters against it. Do not
// edit, and delete it with the offer.
import type {OfferContract} from '../contract/offer_contract';

export const APIManagement_CaaS_Traefik = {
  offerType: 'APIManagement.CaaS.Traefik',
  serviceTypes: [],
  declaredBy: [
    {
      agentId: 'fractal-cloud-agent-aws',
      agentVersion: 'v8.31.0',
      contractSchemaVersion: '2.0',
      provider: 'AWS',
      parameterRules: [],
    },
    {
      agentId: 'fractal-cloud-agent-azure',
      agentVersion: 'v8.31.0',
      contractSchemaVersion: '2.0',
      provider: 'Azure',
      parameterRules: [],
    },
    {
      agentId: 'fractal-cloud-agent-gcp',
      agentVersion: 'v8.31.0',
      contractSchemaVersion: '2.0',
      provider: 'GCP',
      parameterRules: [],
    },
    {
      agentId: 'fractal-cloud-agent-oci',
      agentVersion: 'v8.31.0',
      contractSchemaVersion: '2.0',
      provider: 'OCI',
      parameterRules: [],
    },
  ],
  params: {
    /** Deprecated: id of the Kubernetes cluster component to deploy into. Used only when the component declares no dependency on a Kubernetes cluster; declare that dependency instead. */
    containerPlatform: {type: 'string', required: false},
    /** Ports Traefik listens on, each a map {name, port, exposedPort, protocol, isTlsEnabled, isHttpsRedirected} or a 'name:port' string. exposedPort defaults to port, protocol to tcp (tcp or udp), isTlsEnabled to true (in the string form, true only for https and websecure) and isHttpsRedirected to false. Entries without a name or port are skipped and none left fails the component; a name must be a valid Kubernetes port name (at most 15 characters) and cannot be 'traefik', which the agent reserves. */
    entryPoints: {type: 'array', required: true},
    /** Name of the environment secret the forward-auth service signs its session cookies with. Required together with the other three OIDC keys; a name that resolves to no secret counts as unset. */
    forwardAuthSecretId: {type: 'string', required: false},
    /** Fully qualified host name the Traefik dashboard and API route (and the /_oauth callback when OIDC is on) answers on. When unset, that route matches an empty host, which no request carries: the dashboard and API are unreachable, and so is the /_oauth callback this route serves. */
    hostname: {type: 'string', required: false, default: ''},
    /** Static IP address requested for Traefik's LoadBalancer Service (loadBalancerIP). The address must already be reserved for the cluster; when unset, the cloud provider assigns one. */
    loadbalancerIp: {type: 'string', required: false, default: ''},
    /** Kubernetes namespace Traefik is deployed into. When unset, the component id, which must then be a valid DNS-1123 label (at most 63 lowercase letters, digits and hyphens). */
    namespace: {
      type: 'string',
      required: false,
      derived: {note: 'defaults to the component id when absent'},
    },
    /** Client id of the OIDC application registered for this gateway. Required together with the other three OIDC keys. */
    oidcClientId: {type: 'string', required: false},
    /** Name of the environment secret holding the OIDC client secret; the raw secret is never a parameter. Required together with the other three OIDC keys; a name that resolves to no secret counts as unset. */
    oidcClientSecretId: {type: 'string', required: false},
    /** Issuer URL of the OpenID Connect provider that protects the routes through forward authentication. OIDC is enabled only when oidcIssuerUrl, oidcClientId, oidcClientSecretId and forwardAuthSecretId are all set; setting only some of them fails the component. */
    oidcIssuerUrl: {type: 'string', required: false},
    /** AWS region code the resource lives in (e.g. eu-west-1). When unset, the Live System's region parameter, else the region of the environment's AWS agent, else the agent's configured region. When none of these is known the component is refused: set the region on the environment's AWS agent, or region on the component. The legacy keys location and awsRegion are still read. */
    region: {
      type: 'string',
      required: false,
      agents: [
        'fractal-cloud-agent-aws',
        'fractal-cloud-agent-azure',
        'fractal-cloud-agent-gcp',
      ],
    },
    /** HSTS security-headers middleware: a map {active, stsSeconds, stsIncludeSubdomains, stsPreload, stsForce}. When unset, the middleware is applied with stsSeconds 63072000 (two years) and the three flags true; any key left out of the map takes that same value, and active=false removes the middleware. */
    securityHeadersSettings: {type: 'object', required: false, default: {}},
    /** TLS certificates Traefik serves, each a map {certSecretId, keySecretId, isDefault} naming the environment secrets that hold the base64-encoded PEM certificate and its private key. Entries missing either id are skipped; a named secret that does not exist fails the component. When none is marked isDefault, the first one is the default certificate. */
    tlsCertificates: {type: 'array', required: false, default: []},
    /** TLS options of the entry points, as {supportedTlsVersions, supportedCiphers}: supportedTlsVersions lists TLS_1_0, TLS_1_1, TLS_1_2 or TLS_1_3 (the lowest becomes the minimum version; any other value fails the component), supportedCiphers lists cipher-suite names as Go's crypto/tls spells them (e.g. TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256). Each half left unset keeps its default: TLS 1.2 and 1.3, with a fixed list of ECDHE and TLS 1.3 AES-GCM / ChaCha20 suites. */
    tlsSettings: {type: 'object', required: false, default: {}},
    /** Distributed tracing, as {jaeger: {collectorEndpoint, localAgentPort, localAgentUrlPath}}. Traefik sends traces over OpenTelemetry (OTLP over HTTP) to that endpoint. When jaeger is set without a collectorEndpoint, the endpoint is the Jaeger component this gateway links to with link type JaegerTracing, on localAgentPort (default 4318) and localAgentUrlPath (default /v1/traces), and the component fails when there is no such link. Only an OTLP traces endpoint (a path ending in /v1/traces, not on a Jaeger v1 port 14268 / 6831 / 6832) is used as declared; any other endpoint is sent to the same host's OTLP receiver (http://<host>:4318/v1/traces), and the remap is published in contractWarnings. An endpoint without a scheme is read as http://. The collector must accept OTLP over HTTP, as Jaeger v2 does. When unset, tracing is off. */
    tracing: {type: 'object', required: false, default: {}},
  },
} as const satisfies OfferContract;
