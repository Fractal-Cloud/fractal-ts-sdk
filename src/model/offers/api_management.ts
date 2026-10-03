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
const javaTrim = (value: string): string =>
  value.replace(/^[\x00-\x20]+|[\x00-\x20]+$/g, '');

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
     * Host names the distribution answers for (only with `redirectTo`). The agent
     * requests an ACM certificate for them in us-east-1, validated by DNS, and
     * attaches them once it is issued. It writes no DNS record: it publishes the
     * validation records (`certificateValidationRecords`) and the distribution's
     * `dnsName` / `hostedZoneId` as output fields, for the owner of each name's
     * DNS zone to declare.
     */
    aliases?: string[];
  }
>({
  satisfies: 'APIManagement.ApiGateway',
  offerType: 'APIManagement.PaaS.AwsCloudFront',
  provider: 'AWS',
  deliveryModel: 'PaaS',
  validate: (self, _all, config) => {
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
    if (aliases.length > 0 && target === undefined) {
      throw new Error(
        `Live component '${self.id}': aliases are only served together with redirectTo for now.`,
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
export const Traefik = defineOffer<
  'APIManagement.ApiGateway',
  {namespace?: string}
>({
  satisfies: 'APIManagement.ApiGateway',
  offerType: 'APIManagement.CaaS.Traefik',
  deliveryModel: 'CaaS',
});
