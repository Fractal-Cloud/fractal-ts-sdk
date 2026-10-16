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
 * that bypasses them (a raw operation `set`, a cast) is checked downstream:
 * `allowBulkDelete` is typed `boolean` in the agent's contract (the control
 * plane refuses another type before deploy), and the agent refuses an unknown
 * `recordManagement`. Only `additive` it reads, and holds the zone: no record
 * set is created, changed or deleted until it declares `authoritative` or
 * `lax`. Declaring the vocabulary in the agent's contract would refuse it
 * before deploy.
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
