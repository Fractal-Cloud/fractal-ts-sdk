/**
 * offers/dns.ts — DNS Zone Offers (Catalogue, Level 3).
 *
 * Vendor plumbing only; the zone's shape comes from the DnsZone guardrails.
 * DNS zones are normally declared on the environment (`withDnsZones`);
 * selecting these offers directly in a Live System is advanced and unsupported.
 */
import {defineOffer} from '../core';

/**
 * Amazon Route 53 public hosted zone. Route 53 is global; DNSSEC signing keys
 * live in KMS us-east-1. `adoptExisting` claims an untagged zone of the same
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
});
