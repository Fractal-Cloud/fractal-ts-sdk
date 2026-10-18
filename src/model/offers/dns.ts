/**
 * offers/dns.ts — DNS Zone Offers (Catalogue, Level 3).
 *
 * Vendor plumbing only; the zone's shape comes from the DnsZone guardrails.
 * DNS zones are normally declared on the environment (`withDnsZones`);
 * selecting these offers directly in a Live System is advanced and unsupported.
 */
import {NetworkAndCompute_PaaS_AwsRoute53HostedZone} from './generated/network_and_compute';
import type {ContractConfig} from './contract/contract_config';
import {defineOffer} from '../core';

/**
 * Amazon Route 53 hosted zone (public, or private and associated with the
 * environment's VPCs). Route 53 is global; DNSSEC signing keys live in KMS
 * us-east-1. `adoptExisting` claims an untagged zone of the same
 * name instead of only reporting it.
 */
/*
 * The zone's guardrails are set through `DnsZone`'s setters, which refuse an
 * `allowBulkDelete` that is not a boolean and a `recordManagement` other than
 * `authoritative` or `lax`, and are omitted from this offer's config. A value
 * that bypasses them (a raw operation `set`, a cast) is checked against the
 * agent's contract like every offer parameter: `allowBulkDelete` is typed
 * `boolean` there. The contract declares no vocabulary for `recordManagement`
 * yet; the agent refuses an unknown one, and holds the zone on `additive`.
 */
export const AwsRoute53HostedZone = defineOffer<
  'NetworkAndCompute.DnsZone',
  ContractConfig<
    typeof NetworkAndCompute_PaaS_AwsRoute53HostedZone,
    | 'allowBulkDelete'
    | 'allowSubdomainDelegation'
    | 'allowedRecordTypes'
    | 'caaIssuers'
    | 'dnssec'
    | 'domainName'
    | 'recordManagement'
    | 'records'
    | 'visibility'
  >
>({
  satisfies: 'NetworkAndCompute.DnsZone',
  contract: NetworkAndCompute_PaaS_AwsRoute53HostedZone,
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
