/**
 * offers/api_management.ts — APIManagement Offer catalogue (Level 3).
 *
 * Each offer declares which abstract Component it satisfies, its 3-part offer
 * type, its vendor (provider) and delivery model, and carries vendor knobs in
 * its config type. Vendor-neutral self-hosted offers (CaaS) OMIT `provider`.
 */
import {toContractKey, unsupported} from './neutral_rules';
import {Storage_PaaS_AwsS3} from './generated/storage';
import {
  APIManagement_CaaS_Ambassador,
  APIManagement_CaaS_Traefik,
  APIManagement_CaaS_TraefikGateway,
  APIManagement_PaaS_AwsCloudFront,
  APIManagement_PaaS_AzureApiManagement,
  APIManagement_PaaS_GcpApiGateway,
} from './generated/api_management';
import type {ContractConfig} from './contract/contract_config';
import {defineOffer, type LiveSystemComponent} from '../core';
import {certificateCovers, gatewayCertificateHosts} from './certificate_hosts';
import {TRAEFIK_GATEWAY_OFFER_TYPE} from './offer_type_ids';
import {parseRouteLink} from './route_link_routes';
import type {TraefikGatewayConfig} from './traefik_gateway_config';

/** Throw the error every check here throws, naming the component. */
const refuse = (id: string, why: string): never => {
  throw new Error(`Live component '${id}': ${why}.`);
};

/**
 * An absolute http(s) URL with a host and no user info, and no `%` that is
 * not an escape (Go's url.Parse, the agent's, refuses one).
 */
const FORWARD_AUTH_ADDRESS = /^https?:\/\/[^\s/?#@]+(?:[/?#]\S*)?$/;

/**
 * `forwardAuthAddress` must not carry credentials. aria-agent-caas-k8s accepts
 * any absolute http(s) URL, user info included, and stores it in the gateway's
 * middleware, so this is the only refusal before a credential would be sent on.
 * The value is never echoed.
 */
const ensureForwardAuthAddress = (id: string, value: unknown): void => {
  if (value === undefined) {
    return;
  }
  const address = typeof value === 'string' ? value.trim() : '';
  if (
    !FORWARD_AUTH_ADDRESS.test(address) ||
    /%(?![0-9A-Fa-f]{2})/.test(address)
  ) {
    refuse(id, 'forwardAuthAddress is not an http(s) URL without credentials');
  }
};

// ── ApiGateway ───────────────────────────────────────────────────────────────

/** Trims what Java's `String.trim()` trims, as the agent does: control characters and spaces only. */
const javaTrim = (value: string): string => {
  let start = 0;
  let end = value.length;
  while (start < end && value.charCodeAt(start) <= 0x20) {
    start++;
  }
  while (end > start && value.charCodeAt(end - 1) <= 0x20) {
    end--;
  }
  return value.slice(start, end);
};

const TRAEFIK_OFFER_TYPE = APIManagement_CaaS_Traefik.offerType;
const VPC_ORIGIN_GATEWAY_TYPES: readonly string[] = [
  TRAEFIK_GATEWAY_OFFER_TYPE,
  TRAEFIK_OFFER_TYPE,
];

/** The bucket offer types a CloudFront distribution may link to as its origin. */
const S3_ORIGIN_BUCKET_TYPES: readonly string[] = [
  Storage_PaaS_AwsS3.offerType,
];
/** The settings a bucket link takes: `access` only (the ObjectStorageLink contract). */
const ACCESS_SETTING = 'access';
const STORAGE_ACCESS_VALUES = ['read', 'write', 'read-write'];
/** The keys that apply to a bucket origin only. */
const SITE_KEYS = [
  'defaultRootObject',
  'spaFallback',
  'errorDocument',
] as const;

/** Which linked bucket, if any, is the distribution's origin; refuses more than one, or a bad bucket link. */
const siteBucketOrigin = (
  self: LiveSystemComponent,
  all: readonly LiveSystemComponent[],
  config: {
    region?: unknown;
    defaultRootObject?: unknown;
    spaFallback?: unknown;
    errorDocument?: unknown;
  },
): boolean => {
  const buckets = self.links.flatMap(l => {
    const target = all.find(c => c.id === l.componentId);
    return target !== undefined && S3_ORIGIN_BUCKET_TYPES.includes(target.type)
      ? [{link: l, target}]
      : [];
  });
  if (buckets.length > 1) {
    throw new Error(
      `Live component '${self.id}': links to ${buckets.length} buckets ` +
        `[${buckets.map(b => b.link.componentId).join(', ')}]: at most one can be the origin.`,
    );
  }
  for (const {link, target} of buckets) {
    const others = Object.keys(link.settings)
      .filter(k => k !== ACCESS_SETTING && link.settings[k] !== undefined)
      .sort();
    if (others.length > 0) {
      throw new Error(
        `Live component '${self.id}': the link to the bucket '${link.componentId}' carries ` +
          `${others.join(', ')}; a bucket link takes '${ACCESS_SETTING}' only (read, write or read-write).`,
      );
    }
    const raw = link.settings[ACCESS_SETTING];
    const access = typeof raw === 'string' ? raw.trim() : '';
    if (access === '') {
      throw new Error(
        `Live component '${self.id}': the link to the bucket '${link.componentId}' declares no ` +
          `'${ACCESS_SETTING}'; set it to read.`,
      );
    }
    if (!STORAGE_ACCESS_VALUES.includes(access)) {
      throw new Error(
        `Live component '${self.id}': the link to the bucket '${link.componentId}': '${ACCESS_SETTING}' ` +
          `is '${access}'; it must be read, write or read-write.`,
      );
    }
    if (access === 'write') {
      throw new Error(
        `Live component '${self.id}': the link to the bucket '${link.componentId}' asks for write ` +
          'access; a distribution serving it reads it. Set access to read.',
      );
    }
    const bucketRegion = target.parameters.region;
    if (
      typeof config.region === 'string' &&
      typeof bucketRegion === 'string' &&
      config.region !== bucketRegion
    ) {
      throw new Error(
        `Live component '${self.id}': the bucket '${link.componentId}' is in region ${bucketRegion} ` +
          `and this distribution's component in ${config.region}; a bucket origin is in the component's own region.`,
      );
    }
  }
  const bucketOrigin = buckets.length === 1;
  const declared = SITE_KEYS.filter(k =>
    k === 'spaFallback' ? config.spaFallback === true : config[k] !== undefined,
  );
  if (declared.length > 0 && !bucketOrigin) {
    throw new Error(
      `Live component '${self.id}': ${declared.join(', ')} ${declared.length === 1 ? 'applies' : 'apply'} to a linked bucket origin only.`,
    );
  }
  return bucketOrigin;
};

/** A host name as the AWS agent reads one (`CloudFrontConfig.HOST_NAME`), any case. */
const HOST_NAME =
  /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;
/** A host as the agent normalizes it: trimmed, lower case, no trailing dot. */
const normalizedHost = (value: string): string =>
  javaTrim(value).replace(/\.$/, '').toLowerCase();
/** Bounds CloudFront puts on its origin read and keep-alive timeouts (above 60 s needs a quota increase). */
const ORIGIN_TIMEOUT_MIN = 1;
const ORIGIN_TIMEOUT_MAX = 180;
/** Bounds AWS WAF puts on a rate-based rule's limit (per 5-minute window). */
const WAF_RATE_LIMIT_MIN = 10;
const WAF_RATE_LIMIT_MAX = 2_000_000_000;

/**
 * The checks of the distribution's own parameters the AWS agent makes too
 * (`CloudFrontConfig`), refused before anything is deployed, and a redirect to
 * one of its own aliases, which the agent would deploy as an endless loop.
 * Values are read from the live component, whichever path set them.
 */
const ensureCloudFrontParameters = (
  self: LiveSystemComponent,
  target: string | undefined,
): void => {
  const p = self.parameters;
  const fail = (why: string): never => refuse(self.id, why);
  const aliases = Array.isArray(p.aliases) ? (p.aliases as unknown[]) : [];
  const invalid = aliases.filter(
    a => typeof a !== 'string' || !HOST_NAME.test(normalizedHost(a)),
  );
  if (invalid.length > 0) {
    fail(
      `aliases holds ${invalid.map(a => `'${String(a)}'`).join(', ')}, not a host name`,
    );
  }
  for (const key of ['originDomain', 'originDomainName'] as const) {
    const value = p[key];
    if (
      typeof value === 'string' &&
      javaTrim(value) !== '' &&
      !HOST_NAME.test(normalizedHost(value))
    ) {
      fail(`${key} '${value}' is not a host name`);
    }
  }
  const protocol = p.originProtocol;
  if (
    protocol !== undefined &&
    !(
      typeof protocol === 'string' &&
      ['', 'https', 'http'].includes(javaTrim(protocol).toLowerCase())
    )
  ) {
    fail(`originProtocol '${String(protocol)}' is neither https nor http`);
  }
  const waf = p.wafRateLimitPer5Min;
  if (
    waf !== undefined &&
    (typeof waf !== 'number' ||
      !Number.isInteger(waf) ||
      waf < WAF_RATE_LIMIT_MIN ||
      waf > WAF_RATE_LIMIT_MAX)
  ) {
    fail(
      `wafRateLimitPer5Min ${String(waf)} is not a whole number from ${WAF_RATE_LIMIT_MIN} to ${WAF_RATE_LIMIT_MAX}`,
    );
  }
  for (const key of [
    'originReadTimeoutSeconds',
    'originKeepaliveTimeoutSeconds',
  ] as const) {
    const value = p[key];
    if (
      value !== undefined &&
      (typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value < ORIGIN_TIMEOUT_MIN ||
        value > ORIGIN_TIMEOUT_MAX)
    ) {
      fail(
        `${key} ${String(value)} is not a whole number of seconds from ${ORIGIN_TIMEOUT_MIN} to ${ORIGIN_TIMEOUT_MAX}`,
      );
    }
  }
  const host =
    target === undefined
      ? undefined
      : /^https:\/\/([^/?#]+)/i.exec(target)?.[1];
  if (host !== undefined) {
    const own = normalizedHost(host);
    if (aliases.some(a => typeof a === 'string' && normalizedHost(a) === own)) {
      fail(
        `aliases holds the redirect target's own host ${own}, which would redirect to itself forever`,
      );
    }
  }
};

export const AwsCloudFront = defineOffer<
  'APIManagement.ApiGateway',
  ContractConfig<
    typeof APIManagement_PaaS_AwsCloudFront,
    never,
    {
      /**
       * An `https://` URL. Every request the distribution receives, over HTTP or
       * HTTPS, is answered with `301 Moved Permanently` to this URL followed by the
       * request's own path and query string. Served at the edge by a CloudFront
       * Function: no origin, no bucket.
       */
      redirectTo?: string;
      /**
       * Host names the distribution answers for (with `redirectTo` or an origin).
       * The agent requests an ACM certificate for them in us-east-1, validated by
       * DNS, and attaches them once it is issued. It writes no DNS record: it
       * publishes the validation records (`certificateValidationRecords`) and the
       * distribution's `dnsName` / `hostedZoneId` as output fields, for the owner of
       * each name's DNS zone to declare.
       */
      aliases?: string[];
      /**
       * A custom origin: the host name CloudFront forwards to. For a VPC origin to
       * the platform gateway, LINK this component to the `TraefikGateway` (or
       * `Traefik`) component instead (`bp.link(cdn, gateway)`, no settings, at most
       * one): the agent reads the internal NLB from the gateway's
       * `loadBalancerHostname` output. A link, not a dependency, so the gateway can
       * sit in the same Live System without a cycle, or be a reference.
       *
       * For a static site, LINK this component to an `AwsS3` bucket instead, with
       * the object-storage link `{access: 'read'} satisfies ObjectStorageLink`
       * (at most one; the bucket may be a reference): the agent serves the bucket
       * through an origin access control and grants this distribution alone in
       * the bucket policy, so the bucket stays private. See `defaultRootObject`
       * and `spaFallback`. A distribution has exactly one origin: a linked
       * bucket, a linked gateway or `originDomain`.
       */
      originDomain?: string;
      /**
       * Protocol CloudFront uses to the origin; the agent defaults to `https` for
       * both a VPC origin and `originDomain`. For the VPC origin the internal NLB
       * passes TCP 443 through to the gateway, which terminates TLS with a publicly
       * trusted certificate covering every alias (an NLB TLS listener is refused).
       * `http` is an explicit opt-in to plain HTTP on the private VPC-origin hop.
       */
      originProtocol?: 'https' | 'http';
      /** CloudFront origin response timeout; the agent defaults to 60 (1-180). */
      originReadTimeoutSeconds?: number;
      /**
       * CloudFront origin keep-alive; the agent defaults to 60 (1-180). Keep it
       * below the gateway's idle timeout (TraefikGateway `entryPointIdleTimeoutSeconds`)
       * so CloudFront never reuses a connection the gateway already closed.
       */
      originKeepaliveTimeoutSeconds?: number;
      /** Attach a WAF web ACL (us-east-1); the agent defaults to true. */
      wafEnabled?: boolean;
      /** Requests per 5 minutes per client IP before the WAF rate-based rule blocks; default 2000. */
      wafRateLimitPer5Min?: number;
      /**
       * Host name of a regional, DNS-validated ACM certificate the agent requests
       * in the component's region, e.g. for a public origin's load balancer; it
       * publishes `originCertificateArn` and `originCertificateValidationRecords`.
       * It cannot sit on an NLB used as a VPC origin, which allows no TLS listener.
       */
      originDomainName?: string;
      /**
       * A bucket origin only: the object served for a request to the root (`/`)
       * and to every `<path>/`, e.g. `index.html`. An object key, without a
       * leading `/`. Unset, the agent applies `index.html` to a bucket origin.
       */
      defaultRootObject?: string;
      /**
       * A bucket origin only: serve a single-page app, answering every path the
       * bucket does not hold with the root object and status 200, for the
       * browser router to resolve. Unset is false: a missing object stays 404.
       * Excludes `errorDocument`.
       */
      spaFallback?: boolean;
      /**
       * A bucket origin only: the object served, with status 404, for a key the
       * bucket does not hold (e.g. `404.html`). An object key without a leading
       * `/`. Unset, a missing key is a plain 404. Excludes `spaFallback`.
       *
       * A bucket origin also serves `<path>/` as `<path>/<defaultRootObject>`
       * and compresses, with no key.
       */
      errorDocument?: string;
    }
  >
>({
  satisfies: 'APIManagement.ApiGateway',
  contract: APIManagement_PaaS_AwsCloudFront,
  provider: 'AWS',
  deliveryModel: 'PaaS',
  neutral: {
    cors: unsupported('the agent configures no CORS policy'),
    customDomain: toContractKey(
      APIManagement_PaaS_AwsCloudFront,
      'aliases',
      v => [v],
    ),
    httpsOnly: unsupported('the agent has no HTTPS-only setting'),
    rateLimit: unsupported('the agent has no rate limit setting'),
    routes: unsupported('the agent reads no route list from parameters'),
    dnsZones: unsupported('its agent takes no DNS zone access'),
  },
  // Checked here: which linked bucket or gateway is the origin, whether a TLS
  // gateway's certificate covers the hosts CloudFront forwards, and the agent's
  // own checks of this component's parameters (ensureCloudFrontParameters),
  // which the control plane does not enforce by default.
  validate: (self, all, config) => {
    const target =
      config.redirectTo === undefined
        ? undefined
        : javaTrim(config.redirectTo) || undefined;
    const gateways = all.filter(
      c =>
        VPC_ORIGIN_GATEWAY_TYPES.includes(c.type) &&
        self.links.some(l => l.componentId === c.id),
    );
    if (gateways.length > 1) {
      throw new Error(
        `Live component '${self.id}': links to ${gateways.length} gateways ` +
          `[${gateways.map(g => g.id).join(', ')}]: at most one can be the VPC origin.`,
      );
    }
    const vpcOrigin = gateways.length === 1;
    const customOrigin = (config.originDomain?.trim() ?? '') !== '';
    if (customOrigin && vpcOrigin) {
      throw new Error(
        `Live component '${self.id}': forward to originDomain or a linked gateway, not both.`,
      );
    }
    const bucketOrigin = siteBucketOrigin(self, all, config);
    if (bucketOrigin && (customOrigin || vpcOrigin)) {
      throw new Error(
        `Live component '${self.id}': serve from exactly one origin: a linked bucket, ` +
          'a linked gateway or originDomain.',
      );
    }
    const tlsGateway = gateways.find(
      g => g.parameters.tlsCertificateArn !== undefined,
    );
    if (tlsGateway !== undefined) {
      throw new Error(
        `Live component '${self.id}': a CloudFront VPC origin cannot reach an NLB with ` +
          `a TLS listener, so the gateway '${tlsGateway.id}' behind it stays TCP-only: ` +
          'drop its tlsCertificateArn.',
      );
    }
    if (target !== undefined && (customOrigin || vpcOrigin || bucketOrigin)) {
      throw new Error(
        `Live component '${self.id}': a distribution serves redirectTo or an origin, not both.`,
      );
    }
    ensureCloudFrontParameters(self, target);
    const aliases = Array.isArray(self.parameters.aliases)
      ? self.parameters.aliases
      : [];
    if (
      aliases.length > 0 &&
      target === undefined &&
      !customOrigin &&
      !vpcOrigin &&
      !bucketOrigin
    ) {
      throw new Error(
        `Live component '${self.id}': aliases need an origin (originDomain, a linked ` +
          'gateway or a linked bucket) or redirectTo to serve.',
      );
    }
    // CloudFront checks the origin certificate against the viewer host it
    // forwards, so over https every alias must be covered by a TLS gateway's
    // certificate, by the rule the gateway's agent applies to route hosts.
    const origin = gateways.length === 1 ? gateways[0] : undefined;
    const certificateHosts =
      origin === undefined
        ? undefined
        : gatewayCertificateHosts(origin.parameters);
    // Without Traefik TLS the gateway's NLB has no listener on 443, so an https
    // VPC origin (the agent default) reaches nothing. Only a TraefikGateway of
    // this Live System is known well enough to tell; a reference is not.
    if (
      origin !== undefined &&
      origin.type === TRAEFIK_GATEWAY_OFFER_TYPE &&
      origin.reference === undefined &&
      certificateHosts === undefined &&
      config.originProtocol !== 'http'
    ) {
      throw new Error(
        `Live component '${self.id}': CloudFront reaches gateway '${origin.id}' over https, ` +
          'but it does not terminate TLS (no tlsSecretName, and no dnsZones with TXT write on ' +
          'the zone of its hosts), so its ' +
          "load balancer has no listener on 443: give the gateway TLS, or set originProtocol: 'http'.",
      );
    }
    if (
      origin !== undefined &&
      certificateHosts !== undefined &&
      certificateHosts.length > 0 &&
      config.originProtocol !== 'http'
    ) {
      const uncovered = (config.aliases ?? []).find(
        alias => !certificateCovers(certificateHosts, javaTrim(alias)),
      );
      if (uncovered !== undefined) {
        throw new Error(
          `Live component '${self.id}': alias ${javaTrim(uncovered)} is not covered by the ` +
            `certificate of gateway '${origin.id}' (${certificateHosts.join(',')}): add it ` +
            "to the gateway's tlsHosts, or have CloudFront reach the gateway over http.",
        );
      }
    }
  },
});
export const AzureApiManagement = defineOffer<
  'APIManagement.ApiGateway',
  ContractConfig<typeof APIManagement_PaaS_AzureApiManagement>
>({
  satisfies: 'APIManagement.ApiGateway',
  contract: APIManagement_PaaS_AzureApiManagement,
  provider: 'Azure',
  deliveryModel: 'PaaS',
  neutral: {
    cors: unsupported('the agent configures no CORS policy'),
    customDomain: unsupported('the agent configures no custom domain'),
    httpsOnly: unsupported('the agent has no HTTPS-only setting'),
    rateLimit: unsupported('the agent has no rate limit setting'),
    routes: unsupported('the agent reads no route list from parameters'),
    dnsZones: unsupported('its agent takes no DNS zone access'),
  },
});
export const GcpApiGateway = defineOffer<
  'APIManagement.ApiGateway',
  ContractConfig<typeof APIManagement_PaaS_GcpApiGateway>
>({
  satisfies: 'APIManagement.ApiGateway',
  contract: APIManagement_PaaS_GcpApiGateway,
  provider: 'GCP',
  deliveryModel: 'PaaS',
  neutral: {
    cors: unsupported('the agent configures no CORS policy'),
    customDomain: unsupported('the agent configures no custom domain'),
    httpsOnly: unsupported('the agent has no HTTPS-only setting'),
    rateLimit: unsupported('the agent has no rate limit setting'),
    routes: unsupported('the agent reads no route list from parameters'),
    dnsZones: unsupported('its agent takes no DNS zone access'),
  },
});
// Vendor-neutral CaaS offers — no provider; identified by deliveryModel + offerType.
export const Ambassador = defineOffer<
  'APIManagement.ApiGateway',
  ContractConfig<typeof APIManagement_CaaS_Ambassador>
>({
  satisfies: 'APIManagement.ApiGateway',
  contract: APIManagement_CaaS_Ambassador,
  deliveryModel: 'CaaS',
  neutral: {
    cors: unsupported('the agent configures no CORS policy'),
    customDomain: toContractKey(APIManagement_CaaS_Ambassador, 'host'),
    httpsOnly: unsupported('the agent has no HTTPS-only setting'),
    rateLimit: unsupported('the agent has no rate limit setting'),
    routes: unsupported('the agent reads no route list from parameters'),
    dnsZones: unsupported('its agent takes no DNS zone access'),
  },
});
/** The list knobs of `TraefikGateway`, sent comma-separated as the agent reads them. */
const TRAEFIK_GATEWAY_LISTS = [
  'forwardAuthRequestHeaders',
  'forwardAuthResponseHeaders',
  'forwardAuthExemptComponentIds',
  'tlsHosts',
  'loadBalancerSourceRanges',
] as const;
/**
 * On a TLS gateway every route host must be covered by its certificate: the
 * workload's agent refuses the route otherwise. A route that names no host takes
 * the gateway's `host`, which the gateway's own check already covers.
 */
const ensureRoutesCovered = (
  self: LiveSystemComponent,
  all: readonly LiveSystemComponent[],
): void => {
  const hosts = gatewayCertificateHosts(self.parameters);
  if (hosts === undefined || hosts.length === 0) {
    return;
  }
  for (const source of all) {
    for (const link of source.links) {
      if (link.componentId !== self.id) {
        continue;
      }
      let routeHosts: string[] = [];
      try {
        routeHosts = parseRouteLink(link.settings)
          .map(r => r.host)
          .filter(h => h !== '');
      } catch (e) {
        throw new Error(
          `Route link from '${source.id}' to '${self.id}': ${e instanceof Error ? e.message : String(e)}.`,
        );
      }
      const uncovered = routeHosts.find(h => !certificateCovers(hosts, h));
      if (uncovered !== undefined) {
        throw new Error(
          `Route link from '${source.id}' to '${self.id}': route host ` +
            `"${uncovered}" is not covered by the certificate of gateway ${self.id} ` +
            `(${hosts.join(',')}); add it to the gateway's tlsHosts.`,
        );
      }
    }
  }
};

/** Traefik as the Java cloud agents reconcile it. For the platform gateway on EKS use `TraefikGateway`. */
export const Traefik = defineOffer<
  'APIManagement.ApiGateway',
  ContractConfig<typeof APIManagement_CaaS_Traefik>
>({
  satisfies: 'APIManagement.ApiGateway',
  contract: APIManagement_CaaS_Traefik,
  deliveryModel: 'CaaS',
  neutral: {
    cors: unsupported('the agent configures no CORS policy'),
    customDomain: toContractKey(APIManagement_CaaS_Traefik, 'hostname'),
    httpsOnly: unsupported('the agent has no HTTPS-only setting'),
    rateLimit: unsupported('the agent has no rate limit setting'),
    routes: unsupported('the agent reads no route list from parameters'),
    dnsZones: unsupported('its agent takes no DNS zone access'),
  },
});
/**
 * Traefik on a Kubernetes cluster, installed and owned by the caas-k8s agent
 * (Helm chart, Traefik v3.6). A distinct offer from `Traefik`, which the Java
 * agents reconcile with their own shape.
 * On EKS it sits behind an internal Network Load Balancer
 * (`internalLoadBalancer`), which CloudFront reaches through a VPC origin.
 * Workloads add their routes with an outbound link to it (see
 * `gatewayRouteSettings`), so a Domain Service references the platform's
 * Traefik rather than owning one.
 *
 * Traefik terminates TLS itself on `websecure` with an operator's Secret
 * (`tlsSecretName`) or with a certificate the gateway issues itself: give its
 * component `dnsZones` with TXT write on the zone of its hosts
 * (`ApiGateway.withDnsZones`) and, optionally, `acmeEmail` / `acmeServer`. The
 * agent runs one cert-manager per cluster for its gateways and solves ACME
 * DNS-01 in the zone through the gateway's grant. The NLB passes TCP 443
 * through, which a CloudFront VPC origin can reach with
 * `originProtocol: 'https'`.
 *
 * Output fields: `namespace`, `serviceName`, `releaseName`, `host`,
 * `entryPoint` (`web` while plain HTTP is served, else `websecure`),
 * `loadBalancerHostname`, `forwardAuthEnabled`, `forwardAuthMiddlewareName` /
 * `forwardAuthMiddlewareNamespace` (with ForwardAuth),
 * `forwardAuthExemptComponents` (qualified
 * `<liveSystemId>/<componentId>`, always), `tlsEnabled`, `plainHttpEnabled`
 * (always), `tlsEntryPoint`, `tlsSecretName`, `tlsHosts`,
 * `tlsCertificateExpiresAt` (with TLS),
 * `tlsCertificateName` (`traefik-tls`, when the gateway requested the
 * Certificate), `certManagerRelease` and `clusterIssuerName` (when it issues
 * its own), and the identity granted DNS access (`workloadRoleArn` on EKS,
 * `workloadServiceAccount` on GKE, `workloadPrincipalId` and
 * `workloadClientId` on AKS).
 */
export const TraefikGateway = defineOffer<
  'APIManagement.ApiGateway',
  TraefikGatewayConfig
>({
  satisfies: 'APIManagement.ApiGateway',
  contract: APIManagement_CaaS_TraefikGateway,
  deliveryModel: 'CaaS',
  neutral: {
    cors: unsupported('the agent configures no CORS policy'),
    customDomain: toContractKey(APIManagement_CaaS_TraefikGateway, 'host'),
    httpsOnly: unsupported('the agent has no HTTPS-only setting'),
    rateLimit: unsupported('the agent has no rate limit setting'),
    routes: unsupported('the agent reads no route list from parameters'),
  },
  // Lists travel comma-separated, as the agent's defaults are written.
  instantiate: (ctx, config) => {
    const params: Record<string, unknown> = {...ctx.parameters, ...config};
    for (const key of TRAEFIK_GATEWAY_LISTS) {
      const list = config[key];
      if (list !== undefined) {
        params[key] = list.join(',');
      }
    }
    return [
      {
        id: ctx.id,
        displayName: ctx.displayName,
        type: TRAEFIK_GATEWAY_OFFER_TYPE,
        deliveryModel: 'CaaS',
        parameters: params,
        dependencies: ctx.dependencies,
        links: ctx.links,
      },
    ];
  },
  // Only the encoding, what involves other components, and what no one else
  // refuses (a credential in forwardAuthAddress) are checked here; the other
  // checks of the gateway's own parameters are the control plane's, against
  // the agent's contract (`cloud.liveSystems.deploy` validates first).
  validate: (self, all, config) => {
    ensureForwardAuthAddress(self.id, self.parameters.forwardAuthAddress);
    // An empty list travels as a blank string, which the agent reads as unset:
    // it would apply its default rather than what the empty list says.
    for (const key of TRAEFIK_GATEWAY_LISTS) {
      if (config[key]?.length === 0) {
        refuse(
          self.id,
          `${key} is an empty list: it is sent blank, which the agent reads as unset and replaces with its default; omit it`,
        );
      }
    }
    // aria-agent-caas-k8s (v1.6.0 and later) ignores tlsClusterIssuer: it requests no
    // certificate from it, and only keeps serving one that issuer already wrote
    // until the gateway issues its own. As the only source it would leave a new
    // gateway waiting for a Secret nothing writes.
    if (
      typeof self.parameters.tlsClusterIssuer === 'string' &&
      self.parameters.tlsClusterIssuer.trim() !== '' &&
      gatewayCertificateHosts(self.parameters) === undefined
    ) {
      refuse(
        self.id,
        'tlsClusterIssuer is ignored by aria-agent-caas-k8s, which requests no certificate ' +
          'from it, so this gateway has no certificate source. Fix: give the gateway ' +
          'withDnsZones with TXT write on the zone of its hosts (it issues its own ' +
          'certificate; one already served from the issuer is kept until then), or set ' +
          'tlsSecretName; then remove tlsClusterIssuer',
      );
    }
    // tlsHosts asks for TLS: the agent refuses it without a certificate source
    // rather than serve plain HTTP (aria-agent-caas-k8s v1.6.0). The source is
    // the component's dnsZones as sent; an Interface operation may change them.
    if (
      (config.tlsHosts?.length ?? 0) > 0 &&
      gatewayCertificateHosts(self.parameters) === undefined
    ) {
      refuse(
        self.id,
        'tlsHosts is set, but the gateway has no certificate: set tlsSecretName, ' +
          'or dnsZones with TXT write on the zone of its hosts',
      );
    }
    ensureRoutesCovered(self, all);
  },
});
