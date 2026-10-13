/**
 * components/dns_grantable_record_type.ts — the record types access to an
 * environment DNS zone can be granted on.
 */

/**
 * NS is not grantable, and SOA, DS, SPF and NAPTR never are: a component that
 * could write them could take the zone away from its owner.
 */
export type DnsGrantableRecordType =
  'A' | 'AAAA' | 'CAA' | 'CNAME' | 'MX' | 'PTR' | 'SRV' | 'TXT';
