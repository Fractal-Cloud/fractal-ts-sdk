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
