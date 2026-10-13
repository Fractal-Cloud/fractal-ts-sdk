/**
 * components/dns_zone_access_request.ts — one entry of a component's
 * `dnsZones`: an environment DNS zone and the access asked for on it.
 */
import type {DnsZoneAccess} from './dns_zone_access';

/**
 * `name` is the zone's domain as the environment declares it (no trailing
 * dot); a component's zone is looked up among its own environment's zones and
 * its management environment's. One entry per zone. There is no list of
 * records: the component writes them itself, with its own identity, through
 * the grant.
 */
export type DnsZoneAccessRequest = {
  name: string;
  access: DnsZoneAccess;
};
