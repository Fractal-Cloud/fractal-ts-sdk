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

/** Why `redirectTo` cannot be a redirect target, or undefined when it can. */
const redirectRefusal = (target: string): string | undefined => {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return 'it is not a URL';
  }
  if (url.protocol !== 'https:') {
    return 'it must start with https://';
  }
  if (
    url.search !== '' ||
    url.hash !== '' ||
    target.includes('?') ||
    target.includes('#')
  ) {
    return "the request's own query string is appended, so it may carry neither a query nor a fragment";
  }
  // Read on the text as written: URL drops a default port (`:443`) the agent refuses.
  if (
    url.username !== '' ||
    url.password !== '' ||
    /^https:\/\/[^/]*[:@]/i.test(target)
  ) {
    return 'it may carry neither credentials nor a port';
  }
  // The agent writes the target into the redirect function as a string literal.
  if (/[\s'"\\]/.test(target)) {
    return 'it holds a space, a quote or a backslash';
  }
  return undefined;
};

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
    if (config.redirectTo !== undefined) {
      const refusal = redirectRefusal(config.redirectTo);
      if (refusal !== undefined) {
        throw new Error(
          `Live component '${self.id}': redirectTo '${config.redirectTo}' is not a redirect target: ${refusal}.`,
        );
      }
    }
    const aliases = config.aliases ?? [];
    const invalid = aliases.filter(
      alias => !HOST_NAME.test(alias.replace(/\.$/, '')),
    );
    if (invalid.length > 0) {
      throw new Error(
        `Live component '${self.id}': aliases holds ${invalid.map(a => `'${a}'`).join(', ')}, not a host name.`,
      );
    }
    if (aliases.length > 0 && config.redirectTo === undefined) {
      throw new Error(
        `Live component '${self.id}': aliases are only served together with redirectTo for now.`,
      );
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
