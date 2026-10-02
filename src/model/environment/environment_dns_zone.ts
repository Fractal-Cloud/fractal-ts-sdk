/**
 * environment/environment_dns_zone.ts — one DNS zone of an environment, with
 * a result per agent hosting it.
 */
import type {DnsZoneProviderResult} from './dns_zone_provider_result';

/**
 * A DNS zone the environment declares, or no longer declares but still has
 * realized somewhere while its teardown is reported.
 */
export type EnvironmentDnsZone = {
  /** The zone's domain, as declared in `withDnsZones`. */
  name: string;
  /** `false` once the environment no longer declares the zone. */
  declared: boolean;
  /** Why a declared zone is not hosted exactly as declared (a selected agent
   *  the environment does not have or that does not host DNS zones, DNSSEC that
   *  several agents cannot honor); `null` when it is, or the zone is no longer
   *  declared. */
  unassignedReason: string | null;
  /** One entry per agent: each assigned agent first, then any other agent that
   *  still reports a copy of the zone. */
  results: DnsZoneProviderResult[];
};
