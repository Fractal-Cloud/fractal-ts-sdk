/**
 * offers/dns.ts — DNS Zone Offers (Catalogue, Level 3).
 *
 * Vendor plumbing only; the zone's shape comes from the DnsZone guardrails.
 * DNS zones are normally declared on the environment (`withDnsZones`);
 * selecting these offers directly in a Live System is advanced and unsupported.
 */
import {defineOffer} from '../core';
import {
  canonicalRecordManagement,
  recordManagementRefusal,
} from '../components/dns_record_management';

/**
 * Amazon Route 53 hosted zone (public, or private and associated with the
 * environment's VPCs). Route 53 is global; DNSSEC signing keys live in KMS
 * us-east-1. `adoptExisting` claims an untagged zone of the same
 * name instead of only reporting it.
 */
export const AwsRoute53HostedZone = defineOffer<
  'NetworkAndCompute.DnsZone',
  {adoptExisting?: boolean; comment?: string}
>({
  satisfies: 'NetworkAndCompute.DnsZone',
  offerType: 'NetworkAndCompute.PaaS.AwsRoute53HostedZone',
  provider: 'AWS',
  deliveryModel: 'PaaS',
  // The deprecated 'authoritative' is sent as 'strict' whichever way it got
  // into the blueprint (the builder canonicalizes it already; an operation's
  // `ops.set` or a raw `guardrail(...)` does not).
  instantiate: (ctx, config) => {
    const parameters: Record<string, unknown> = {
      ...ctx.parameters,
      ...(config as Record<string, unknown>),
    };
    if (parameters.recordManagement !== undefined) {
      parameters.recordManagement = canonicalRecordManagement(
        parameters.recordManagement,
      );
    }
    return [
      {
        id: ctx.id,
        displayName: ctx.displayName,
        type: 'NetworkAndCompute.PaaS.AwsRoute53HostedZone',
        provider: 'AWS',
        deliveryModel: 'PaaS',
        parameters,
        dependencies: ctx.dependencies,
        links: ctx.links,
      },
    ];
  },
  // Catches what the guardrail's type does not reach: an operation's
  // `ops.set`, a raw `guardrail(...)`, or an offer config cast past its type.
  validate: self => {
    const refusal = recordManagementRefusal(self.parameters.recordManagement);
    if (refusal !== undefined) {
      throw new Error(`Live component '${self.id}': ${refusal}`);
    }
  },
});
