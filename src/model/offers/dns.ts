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
import {allowBulkDeleteRefusal} from '../components/dns_bulk_delete';
import {recordManagementRefusal} from '../components/dns_record_management';

/**
 * Amazon Route 53 hosted zone (public, or private and associated with the
 * environment's VPCs). Route 53 is global; DNSSEC signing keys live in KMS
 * us-east-1. `adoptExisting` claims an untagged zone of the same
 * name instead of only reporting it.
 */
/*
 * The zone's guardrails are set through `DnsZone`'s setters, which refuse an
 * `allowBulkDelete` that is not a boolean and a `recordManagement` other than
 * `authoritative` or `lax`. `validate` repeats both checks on the live
 * component, for a value that bypasses the setters (an operation's `ops.set`,
 * a raw `guardrail(...)`, a config cast past its type): the agent's contract
 * declares no vocabulary for `recordManagement`, and the SDK does not check
 * vendor config against the contract, so nothing else refuses it before the
 * agent, which holds the zone on `additive` rather than failing it.
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
  validate: self => {
    const refusal =
      recordManagementRefusal(self.parameters.recordManagement) ??
      allowBulkDeleteRefusal(self.parameters.allowBulkDelete);
    if (refusal !== undefined) {
      throw new Error(`Live component '${self.id}': ${refusal}`);
    }
  },
});
