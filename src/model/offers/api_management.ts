/**
 * offers/api_management.ts — APIManagement Offer catalogue (Level 3).
 *
 * Each offer declares which abstract Component it satisfies, its 3-part offer
 * type, its vendor (provider) and delivery model, and carries vendor knobs in
 * its config type. Vendor-neutral self-hosted offers (CaaS) OMIT `provider`.
 */
import {defineOffer} from '../core';

// ── ApiGateway ───────────────────────────────────────────────────────────────
/** What a host name in `aliases` may be: dot-separated labels of letters, digits and inner hyphens. */
const HOST_NAME =
  /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

/**
 * A redirect target's host as `java.net.URI` reads one, which the agent parses it with: a host
 * name whose last label starts with a letter (an all-digit one leaves URI without a host).
 */
const TARGET_HOST =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])?$/i;

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

/**
 * Why `redirectTo` cannot be a redirect target, or undefined when it can. Read on the text as
 * written, by the cloud agent's own grammar, rather than through `URL`, which percent-encodes or
 * normalizes what the agent refuses: `https://`, a DNS host name, and an optional path of URL path
 * characters and well-formed percent escapes (the agent writes it into its redirect function).
 */
const redirectRefusal = (target: string): string | undefined => {
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(.*)$/i.exec(target);
  if (match === null) {
    return 'it is not a URL of the form https://host[/path]';
  }
  const [, scheme, authority, path, rest] = match;
  if (scheme.toLowerCase() !== 'https') {
    return 'it must start with https://';
  }
  if (rest !== '') {
    return "the request's own query string is appended, so it may carry neither a query nor a fragment";
  }
  if (authority.includes('@') || authority.includes(':')) {
    return 'it may carry neither credentials nor a port';
  }
  if (!TARGET_HOST.test(authority.replace(/\.$/, ''))) {
    return 'its host is not a DNS host name';
  }
  if (!/^(?:[A-Za-z0-9\-._~!$&()*+,;=:@/]|%[0-9A-Fa-f]{2})*$/.test(path)) {
    return 'its path holds characters a URL path may not (or a malformed percent escape)';
  }
  return undefined;
};

/** The gateway offer types a CloudFront distribution may link to as its VPC origin. */
const TRAEFIK_OFFER_TYPE = 'APIManagement.CaaS.Traefik';
const TRAEFIK_GATEWAY_OFFER_TYPE = 'APIManagement.CaaS.TraefikGateway';
const VPC_ORIGIN_GATEWAY_TYPES = [
  TRAEFIK_GATEWAY_OFFER_TYPE,
  TRAEFIK_OFFER_TYPE,
];
/** Bounds CloudFront puts on its origin read and keep-alive timeouts (above 60 s needs a quota increase). */
const ORIGIN_TIMEOUT_MIN = 1;
const ORIGIN_TIMEOUT_MAX = 180;
/** Bounds AWS WAF puts on a rate-based rule's limit (per 5-minute window). */
const WAF_RATE_LIMIT_MIN = 10;
const WAF_RATE_LIMIT_MAX = 2_000_000_000;

/** The host of a target `redirectRefusal` accepted, lower case, without a trailing dot. */
const targetHost = (target: string): string =>
  target
    .replace(/^https:\/\//i, '')
    .split('/')[0]
    .replace(/\.$/, '')
    .toLowerCase();

export const AwsCloudFront = defineOffer<
  'APIManagement.ApiGateway',
  {
    region?: string;
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
  }
>({
  satisfies: 'APIManagement.ApiGateway',
  offerType: 'APIManagement.PaaS.AwsCloudFront',
  provider: 'AWS',
  deliveryModel: 'PaaS',
  validate: (self, all, config) => {
    // Blank is no redirect, as the agent reads it; the agent trims the value.
    const target =
      config.redirectTo === undefined
        ? undefined
        : javaTrim(config.redirectTo) || undefined;
    if (target !== undefined) {
      const refusal = redirectRefusal(target);
      if (refusal !== undefined) {
        throw new Error(
          `Live component '${self.id}': redirectTo '${config.redirectTo}' is not a redirect target: ${refusal}.`,
        );
      }
    }
    const aliases = config.aliases ?? [];
    const invalid = aliases.filter(
      alias => !HOST_NAME.test(javaTrim(alias).replace(/\.$/, '')),
    );
    if (invalid.length > 0) {
      throw new Error(
        `Live component '${self.id}': aliases holds ${invalid.map(a => `'${a}'`).join(', ')}, not a host name.`,
      );
    }
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
    const originDomain = config.originDomain?.trim() ?? '';
    const customOrigin = originDomain !== '';
    if (customOrigin && !HOST_NAME.test(originDomain)) {
      throw new Error(
        `Live component '${self.id}': originDomain '${config.originDomain}' is not a host name.`,
      );
    }
    if (customOrigin && vpcOrigin) {
      throw new Error(
        `Live component '${self.id}': forward to originDomain or a linked gateway, not both.`,
      );
    }
    if (target !== undefined && (customOrigin || vpcOrigin)) {
      throw new Error(
        `Live component '${self.id}': a distribution serves redirectTo or an origin, not both.`,
      );
    }
    if (
      aliases.length > 0 &&
      target === undefined &&
      !customOrigin &&
      !vpcOrigin
    ) {
      throw new Error(
        `Live component '${self.id}': aliases need an origin (originDomain or a linked ` +
          'gateway) or redirectTo to serve.',
      );
    }
    if (
      config.originProtocol !== undefined &&
      !['https', 'http'].includes(config.originProtocol)
    ) {
      throw new Error(
        `Live component '${self.id}': originProtocol '${config.originProtocol}' is neither https nor http.`,
      );
    }
    if (
      config.wafRateLimitPer5Min !== undefined &&
      (!Number.isInteger(config.wafRateLimitPer5Min) ||
        config.wafRateLimitPer5Min < WAF_RATE_LIMIT_MIN ||
        config.wafRateLimitPer5Min > WAF_RATE_LIMIT_MAX)
    ) {
      throw new Error(
        `Live component '${self.id}': wafRateLimitPer5Min ${config.wafRateLimitPer5Min} is not a whole number from ${WAF_RATE_LIMIT_MIN} to ${WAF_RATE_LIMIT_MAX}.`,
      );
    }
    for (const key of [
      'originReadTimeoutSeconds',
      'originKeepaliveTimeoutSeconds',
    ] as const) {
      const value = config[key];
      if (
        value !== undefined &&
        (!Number.isInteger(value) ||
          value < ORIGIN_TIMEOUT_MIN ||
          value > ORIGIN_TIMEOUT_MAX)
      ) {
        throw new Error(
          `Live component '${self.id}': ${key} ${value} is not a whole number of seconds from ${ORIGIN_TIMEOUT_MIN} to ${ORIGIN_TIMEOUT_MAX}.`,
        );
      }
    }
    if (
      config.originDomainName !== undefined &&
      !HOST_NAME.test(config.originDomainName)
    ) {
      throw new Error(
        `Live component '${self.id}': originDomainName '${config.originDomainName}' is not a host name.`,
      );
    }
    if (target !== undefined) {
      const host = targetHost(target);
      const looping = aliases.filter(
        alias => javaTrim(alias).replace(/\.$/, '').toLowerCase() === host,
      );
      if (looping.length > 0) {
        throw new Error(
          `Live component '${self.id}': aliases holds the redirect target's own host ${host}, which would redirect to itself forever.`,
        );
      }
    }
  },
});
export const AzureApiManagement = defineOffer<
  'APIManagement.ApiGateway',
  {region?: string; publisherEmail: string; sku: string}
>({
  satisfies: 'APIManagement.ApiGateway',
  offerType: 'APIManagement.PaaS.AzureApiManagement',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcpApiGateway = defineOffer<
  'APIManagement.ApiGateway',
  {region?: string}
>({
  satisfies: 'APIManagement.ApiGateway',
  offerType: 'APIManagement.PaaS.GcpApiGateway',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
// Vendor-neutral CaaS offers — no provider; identified by deliveryModel + offerType.
export const Ambassador = defineOffer<
  'APIManagement.ApiGateway',
  {namespace?: string}
>({
  satisfies: 'APIManagement.ApiGateway',
  offerType: 'APIManagement.CaaS.Ambassador',
  deliveryModel: 'CaaS',
});
const FORWARD_AUTH_LISTS = [
  'forwardAuthRequestHeaders',
  'forwardAuthResponseHeaders',
  'forwardAuthExcludedPrefixes',
] as const;
const HEADER_NAME = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;

const ensureValidForwardAuth = (
  id: string,
  config: {
    forwardAuthAddress?: string;
    forwardAuthRequestHeaders?: readonly string[];
    forwardAuthResponseHeaders?: readonly string[];
    forwardAuthForwardBody?: boolean;
    forwardAuthMaxBodySize?: number;
    forwardAuthExcludedPrefixes?: readonly string[];
  },
): void => {
  const refuse = (why: string): never => {
    throw new Error(`Live component '${id}': ${why}.`);
  };
  const address = config.forwardAuthAddress;
  const anyOther = Object.entries(config).some(
    ([k, v]) =>
      k.startsWith('forwardAuth') &&
      k !== 'forwardAuthAddress' &&
      v !== undefined,
  );
  if (address === undefined) {
    if (anyOther) {
      refuse('ForwardAuth settings without forwardAuthAddress do nothing');
    }
    return;
  }
  // The value is not echoed: it could carry credentials.
  if (!/^https?:\/\/[^\s/?#@]+(\/[^\s]*)?$/.test(address)) {
    refuse('forwardAuthAddress is not an http(s) URL without credentials');
  }
  for (const key of [
    'forwardAuthRequestHeaders',
    'forwardAuthResponseHeaders',
  ] as const) {
    const bad = (config[key] ?? []).find(h => !HEADER_NAME.test(h));
    if (bad !== undefined) {
      refuse(`${key} holds '${bad}', which is not a header name`);
    }
  }
  const badPrefix = (config.forwardAuthExcludedPrefixes ?? []).find(
    p => !p.startsWith('/') || p.includes(','),
  );
  if (badPrefix !== undefined) {
    refuse(
      `forwardAuthExcludedPrefixes holds '${badPrefix}', which is not a path prefix`,
    );
  }
  const size = config.forwardAuthMaxBodySize;
  if (size !== undefined && (!Number.isInteger(size) || size < 1)) {
    refuse(
      `forwardAuthMaxBodySize ${size} is not a whole number of bytes of at least 1`,
    );
  }
};

/** Traefik as the Java cloud agents reconcile it. For the platform gateway on EKS use `TraefikGateway`. */
export const Traefik = defineOffer<
  'APIManagement.ApiGateway',
  {namespace?: string}
>({
  satisfies: 'APIManagement.ApiGateway',
  offerType: TRAEFIK_OFFER_TYPE,
  deliveryModel: 'CaaS',
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
 * Output fields: `loadBalancerHostname`, `namespace`.
 */
export const TraefikGateway = defineOffer<
  'APIManagement.ApiGateway',
  {
    /** Default `traefik`. */
    namespace?: string;
    /** Default 2. */
    replicas?: number;
    /** Traefik Helm chart version; the agent pins a v3.6.x chart by default. */
    chartVersion?: string;
    /** Host a route matches when it names none, e.g. `api.fractal.cloud`. */
    host?: string;
    /** An internal NLB (EKS Auto Mode load balancer class); default true. */
    internalLoadBalancer?: boolean;
    /**
     * Regional ACM certificate for a TLS listener on 443 of the NLB. NOT for a
     * gateway behind a CloudFront VPC origin: a VPC origin cannot reach an NLB
     * with a TLS listener, so that NLB stays TCP-only and the combination is
     * refused.
     */
    tlsCertificateArn?: string;
    /**
     * Idle timeout of the entry points; default 75. Must exceed the keep-alive
     * of whatever is in front (CloudFront's origin keep-alive).
     */
    entryPointIdleTimeoutSeconds?: number;
    /**
     * A ForwardAuth middleware on every route the workload links create (except
     * `forwardAuthExcludedPrefixes`): each request is first sent to this URL,
     * with its method preserved, and is refused unless it answers 2xx.
     */
    forwardAuthAddress?: string;
    /** Request headers sent to the auth service; default x-clientid, x-clientsecret, origin. */
    forwardAuthRequestHeaders?: readonly string[];
    /** Auth-service response headers copied onto the request; default x-jwt. */
    forwardAuthResponseHeaders?: readonly string[];
    /** Send the request body to the auth service; default true. */
    forwardAuthForwardBody?: boolean;
    /** Largest body forwarded to the auth service, in bytes; default 1048576. */
    forwardAuthMaxBodySize?: number;
    /** Route prefixes not authenticated; default /ocelot/, /grafana/, /prometheus/, /alertmanager/. */
    forwardAuthExcludedPrefixes?: readonly string[];
  }
>({
  satisfies: 'APIManagement.ApiGateway',
  offerType: TRAEFIK_GATEWAY_OFFER_TYPE,
  deliveryModel: 'CaaS',
  // Lists travel comma-separated, as the agent's defaults are written.
  instantiate: (ctx, config) => {
    const params: Record<string, unknown> = {...ctx.parameters, ...config};
    for (const key of FORWARD_AUTH_LISTS) {
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
  validate: (self, _all, config) => {
    ensureValidForwardAuth(self.id, config);
    if (config.host !== undefined && !HOST_NAME.test(config.host)) {
      throw new Error(
        `Live component '${self.id}': host '${config.host}' is not a host name.`,
      );
    }
    if (
      config.replicas !== undefined &&
      (!Number.isInteger(config.replicas) || config.replicas < 1)
    ) {
      throw new Error(
        `Live component '${self.id}': replicas ${config.replicas} is not a whole number of at least 1.`,
      );
    }
    if (
      config.tlsCertificateArn !== undefined &&
      !/^arn:aws[a-z-]*:acm:[a-z0-9-]+:\d{12}:certificate\/[A-Za-z0-9-]+$/.test(
        config.tlsCertificateArn,
      )
    ) {
      throw new Error(
        `Live component '${self.id}': tlsCertificateArn '${config.tlsCertificateArn}' is not an ACM certificate ARN.`,
      );
    }
    if (
      config.entryPointIdleTimeoutSeconds !== undefined &&
      (!Number.isInteger(config.entryPointIdleTimeoutSeconds) ||
        config.entryPointIdleTimeoutSeconds < 1)
    ) {
      throw new Error(
        `Live component '${self.id}': entryPointIdleTimeoutSeconds ${config.entryPointIdleTimeoutSeconds} is not a whole number of seconds of at least 1.`,
      );
    }
  },
});
