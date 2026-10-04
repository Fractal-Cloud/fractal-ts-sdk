/**
 * offers/dns.ts — DNS Zone Offers (Catalogue, Level 3).
 *
 * Vendor plumbing only; the zone's shape comes from the DnsZone guardrails.
 * DNS zones are normally declared on the environment (`withDnsZones`);
 * selecting these offers directly in a Live System is advanced and unsupported.
 */
import {defineOffer} from '../core';
import {allowBulkDeleteRefusal} from '../components/dns_bulk_delete';
import {recordManagementRefusal} from '../components/dns_record_management';

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
  // Catches what the guardrail's type does not reach: an operation's
  // `ops.set`, a raw `guardrail(...)`, or an offer config cast past its type.
  validate: self => {
    const refusal =
      recordManagementRefusal(self.parameters.recordManagement) ??
      allowBulkDeleteRefusal(self.parameters.allowBulkDelete);
    if (refusal !== undefined) {
      throw new Error(`Live component '${self.id}': ${refusal}`);
    }
  },
});
