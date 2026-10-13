/**
 * components/dns_zone_component_access.ts — the ceiling an environment DNS zone
 * sets on the access its components may be granted (`componentAccess`).
 */
import type {DnsAccessLevel} from './dns_access_level';
import type {DnsGrantableRecordType} from './dns_grantable_record_type';

/**
 * The same map as a component's request, except that a type takes only
 * `write` or `none`: reading cannot be allowed per type (any access reads the
 * whole zone), so read is allowed for every type at once with `'*': 'read'`.
 * Absent or empty, no component is granted anything on the zone.
 *
 * Write is allocatable only in a `lax` zone, and only on the zone's
 * `allowedRecordTypes`; anything else in the ceiling is inert (the control
 * plane warns). `{'*': 'read', TXT: 'write'}` lets components read the zone
 * and write TXT records, e.g. for ACME DNS-01 challenges.
 */
export type DnsZoneComponentAccess = {'*'?: DnsAccessLevel} & {
  [T in DnsGrantableRecordType]?: Exclude<DnsAccessLevel, 'read'>;
};
