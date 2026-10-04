/**
 * components/dns_record_management_mode.ts — the values of a DNS zone's
 * `recordManagement` (see `DnsZoneGuardrails.recordManagement`).
 */

/**
 * `'authoritative'` (the default, also when omitted): every record set the
 * zone does not declare is deleted. `'lax'`: record sets Fractal Cloud did not
 * define are left alone. Sent exactly as chosen.
 */
export type DnsRecordManagement = 'authoritative' | 'lax';
