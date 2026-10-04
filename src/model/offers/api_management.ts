/**
 * offers/api_management.ts — APIManagement Offer catalogue (Level 3).
 *
 * Each offer declares which abstract Component it satisfies, its 3-part offer
 * type, its vendor (provider) and delivery model, and carries vendor knobs in
 * its config type. Vendor-neutral self-hosted offers (CaaS) OMIT `provider`.
 */
import {defineOffer} from '../core';
import {
  ensureNamespace,
  isCidr,
  isKubernetesName,
  refuse,
} from './caas_param_checks';
import type {TraefikGatewayConfig} from './traefik_gateway_config';

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
/** The list knobs of `TraefikGateway`, sent comma-separated as the agent reads them. */
const TRAEFIK_GATEWAY_LISTS = [
  'forwardAuthRequestHeaders',
  'forwardAuthResponseHeaders',
  'forwardAuthExcludedPrefixes',
  'forwardAuthExemptComponentIds',
  'tlsHosts',
  'loadBalancerSourceRanges',
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
    forwardAuthExemptComponentIds?: readonly string[];
  },
): void => {
  const address = config.forwardAuthAddress;
  const anyOther = Object.entries(config).some(
    ([k, v]) =>
      k.startsWith('forwardAuth') &&
      k !== 'forwardAuthAddress' &&
      v !== undefined,
  );
  if (address === undefined) {
    if (anyOther) {
      refuse(id, 'ForwardAuth settings without forwardAuthAddress do nothing');
    }
    return;
  }
  // The value is not echoed: it could carry credentials.
  if (!/^https?:\/\/[^\s/?#@]+(\/[^\s]*)?$/.test(address)) {
    refuse(id, 'forwardAuthAddress is not an http(s) URL without credentials');
  }
  for (const key of [
    'forwardAuthRequestHeaders',
    'forwardAuthResponseHeaders',
  ] as const) {
    const bad = (config[key] ?? []).find(h => !HEADER_NAME.test(h));
    if (bad !== undefined) {
      refuse(id, `${key} holds '${bad}', which is not a header name`);
    }
  }
  const badPrefix = (config.forwardAuthExcludedPrefixes ?? []).find(
    p => !p.startsWith('/') || p.includes(','),
  );
  if (badPrefix !== undefined) {
    refuse(
      id,
      `forwardAuthExcludedPrefixes holds '${badPrefix}', which is not a path prefix`,
    );
  }
  const badExempt = (config.forwardAuthExemptComponentIds ?? []).find(
    c =>
      c.trim() === '' ||
      c.startsWith('/') ||
      c.endsWith('/') ||
      c.includes(','),
  );
  if (badExempt !== undefined) {
    refuse(
      id,
      `forwardAuthExemptComponentIds entry '${badExempt}' is neither a component id nor <liveSystemId>/<componentId>`,
    );
  }
  const size = config.forwardAuthMaxBodySize;
  if (size !== undefined && (!Number.isInteger(size) || size < 1)) {
    refuse(
      id,
      `forwardAuthMaxBodySize ${size} is not a whole number of bytes of at least 1`,
    );
  }
};

/** What a certificate host in `tlsHosts` may be, once a leading `*.` is set aside, as the agent reads it. */
const isCertificateHost = (host: string): boolean => {
  const name = host.startsWith('*.') ? host.slice(2) : host;
  return (
    !name.includes('*') &&
    name.includes('.') &&
    isKubernetesName(name.toLowerCase())
  );
};

/** Whether a certificate for `hosts` is valid for `host`, as a TLS client checks it. */
const certificateCovers = (hosts: readonly string[], host: string): boolean => {
  const wanted = host.replace(/\.$/, '').toLowerCase();
  return hosts.some(h => {
    const name = h.replace(/\.$/, '').toLowerCase();
    if (name === wanted) {
      return true;
    }
    if (!name.startsWith('*.')) {
      return false;
    }
    const dot = wanted.indexOf('.');
    return dot > 0 && wanted.slice(dot + 1) === name.slice(2);
  });
};

/**
 * Traefik-terminated TLS, refused as the agent refuses it: TLS is on iff
 * `tlsSecretName` or `tlsClusterIssuer` is set; without it `tlsHosts` and
 * `plainHttp: false` serve nothing; with it, port 443 cannot also carry an NLB
 * TLS listener, and the certificate must cover `host`.
 */
const ensureValidTraefikTls = (
  id: string,
  config: TraefikGatewayConfig,
): void => {
  const tls =
    config.tlsSecretName !== undefined || config.tlsClusterIssuer !== undefined;
  if (!tls) {
    if (config.tlsHosts !== undefined && config.tlsHosts.length > 0) {
      refuse(
        id,
        'tlsHosts is set, but neither tlsSecretName nor tlsClusterIssuer: the gateway has no certificate',
      );
    }
    if (config.plainHttp === false) {
      refuse(
        id,
        'plainHttp is false and the gateway has no TLS (tlsSecretName or tlsClusterIssuer): it would serve nothing',
      );
    }
    return;
  }
  for (const key of ['tlsSecretName', 'tlsClusterIssuer'] as const) {
    const name = config[key];
    if (name !== undefined && !isKubernetesName(name.trim())) {
      refuse(id, `${key} '${name}' is not a Kubernetes name`);
    }
  }
  if (config.tlsCertificateArn !== undefined) {
    refuse(
      id,
      'tlsCertificateArn and Traefik TLS (tlsSecretName or tlsClusterIssuer) both need port 443: choose one',
    );
  }
  const hosts =
    config.tlsHosts !== undefined && config.tlsHosts.length > 0
      ? config.tlsHosts
      : config.host !== undefined
        ? [config.host]
        : [];
  if (hosts.length === 0) {
    refuse(
      id,
      'TLS needs the hosts the certificate covers: set tlsHosts, or host',
    );
  }
  const bad = hosts.find(h => !isCertificateHost(h.trim()));
  if (bad !== undefined) {
    refuse(
      id,
      `tlsHosts entry '${bad}' is not a host name or a one-label wildcard (*.example.com)`,
    );
  }
  if (
    config.host !== undefined &&
    !certificateCovers(
      hosts.map(h => h.trim()),
      config.host,
    )
  ) {
    refuse(
      id,
      `host '${config.host}', the default host of every route, is not covered by tlsHosts ${hosts.join(',')}`,
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
 * With `tlsClusterIssuer` (or `tlsSecretName`) Traefik terminates TLS itself on
 * `websecure`: the NLB passes TCP 443 through, which a CloudFront VPC origin
 * can reach with `originProtocol: 'https'`.
 *
 * Output fields: `namespace`, `serviceName`, `releaseName`, `host`,
 * `entryPoint` (`web` while plain HTTP is served, else `websecure`),
 * `loadBalancerHostname`, `forwardAuthEnabled`, `forwardAuthMiddlewareName` /
 * `forwardAuthMiddlewareNamespace` (with ForwardAuth),
 * `forwardAuthExcludedPrefixes`, `forwardAuthExemptComponents` (qualified
 * `<liveSystemId>/<componentId>`, always), `tlsEnabled`, `plainHttpEnabled`
 * (always), `tlsEntryPoint`, `tlsSecretName`, `tlsHosts` (with TLS),
 * `tlsCertificateName` (`traefik-tls`, when the gateway requested the
 * Certificate).
 */
export const TraefikGateway = defineOffer<
  'APIManagement.ApiGateway',
  TraefikGatewayConfig
>({
  satisfies: 'APIManagement.ApiGateway',
  offerType: TRAEFIK_GATEWAY_OFFER_TYPE,
  deliveryModel: 'CaaS',
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
  validate: (self, _all, config) => {
    ensureNamespace(self.id, config.namespace);
    // An empty list travels as a blank string, which the agent reads as unset:
    // it would apply its default (e.g. still exempt `ocelot`) rather than none.
    for (const key of TRAEFIK_GATEWAY_LISTS) {
      if (config[key]?.length === 0) {
        refuse(
          self.id,
          `${key} is an empty list: it is sent blank, which the agent reads as unset and replaces with its default; omit it`,
        );
      }
    }
    ensureValidForwardAuth(self.id, config);
    ensureValidTraefikTls(self.id, config);
    const badRange = (config.loadBalancerSourceRanges ?? []).find(
      r => !isCidr(r),
    );
    if (badRange !== undefined) {
      refuse(
        self.id,
        `loadBalancerSourceRanges entry '${badRange}' is not a CIDR`,
      );
    }
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
