/**
 * environment/environment_dns_zone.ts — one DNS zone of an environment, with
 * a result per provider hosting it.
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
  /** Why no provider is assigned to a declared zone (e.g. the environment has
   *  agents for several DNS providers and the zone names none); `null` when a
   *  provider is assigned or the zone is no longer declared. */
  unassignedReason: string | null;
  /** One entry per provider: each assigned provider first, then any other
   *  provider that still reports a copy of the zone. */
  results: DnsZoneProviderResult[];
};
