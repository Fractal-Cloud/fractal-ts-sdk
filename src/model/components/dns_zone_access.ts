/**
 * components/dns_zone_access.ts — the access a component requests to one
 * environment DNS zone.
 */
import type {DnsAccessLevel} from './dns_access_level';
import type {DnsGrantableRecordType} from './dns_grantable_record_type';

/**
 * Access by record type: `'*'` is every grantable type, and a type named
 * explicitly overrides `'*'`. `{TXT: 'write'}` writes TXT records (and, as any
 * access does, reads the whole zone); `{'*': 'write', MX: 'none'}` writes every
 * type but MX. A per-type `read` is read as `'*': 'read'`, since any access
 * reads the whole zone.
 *
 * What is granted is this request cut down to the zone's `componentAccess`
 * ceiling, type by type; write is granted only in a `lax` zone.
 */
export type DnsZoneAccess = {'*'?: DnsAccessLevel} & {
  [T in DnsGrantableRecordType]?: DnsAccessLevel;
};
