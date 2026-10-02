/**
 * environment/dns_zone_provider.ts — the cloud hosting one copy of a DNS zone.
 */

/**
 * The cloud whose agent realizes a DNS zone, in the SDK's provider spelling.
 * A provider the control plane names that this SDK version does not know is
 * passed through as the control plane spells it, rather than failing the read.
 */
export type DnsZoneProvider = 'AWS' | 'GCP' | 'Azure' | (string & {});
