/**
 * environment/environment_dns_zones.ts — what `cloud.environments.dnsZones()`
 * returns.
 */
import type {EnvironmentDnsZone} from './environment_dns_zone';

/** An environment's DNS zones, and what in its declaration could not be used. */
export type EnvironmentDnsZones = {
  zones: EnvironmentDnsZone[];
  /** What could not be used: entries of the `dnsZones` declaration the control
   *  plane rejected (one it cannot read, or a name declared twice), and output
   *  fields an agent reported malformed, as `<zone> (<provider>): <path> <why>`
   *  (that field is left empty on its result). */
  problems: string[];
};
