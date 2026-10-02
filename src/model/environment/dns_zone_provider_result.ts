/**
 * environment/dns_zone_provider_result.ts — one provider's copy of a DNS zone,
 * as its cloud agent last reported it.
 */
import type {DnsZoneOutputs} from '../components/dns';
import type {DnsZoneProvider} from './dns_zone_provider';
import type {DnsZoneResultStatus} from './dns_zone_result_status';

/**
 * What one provider's agent reported about a zone. `nameServers` (NS) and
 * `dsRecords` (DS) are what a registrar needs to delegate the domain; both are
 * empty until the agent reports them, and `dsRecords` stays empty for a zone
 * that is not signed.
 */
export type DnsZoneProviderResult = {
  provider: DnsZoneProvider;
  /** Whether the environment currently assigns the zone to this provider. A
   *  result that is not assigned is a copy being held or torn down. */
  assigned: boolean;
  status: DnsZoneResultStatus;
  /** The agent's reason when the status is not `Active`; empty otherwise. */
  message: string;
  /** The provider's id of the zone (e.g. the Route 53 hosted zone id). */
  zoneId: string | null;
  nameServers: string[];
  dsRecords: NonNullable<DnsZoneOutputs['dsRecords']>;
  /** Every output field the agent reported, including provider-specific ones
   *  beside the shared `zoneId`, `nameServers` and `dsRecords`. */
  outputs: Record<string, unknown>;
  /** When the agent last reported (ISO 8601); `null` while `Pending`. */
  updatedAt: string | null;
};
