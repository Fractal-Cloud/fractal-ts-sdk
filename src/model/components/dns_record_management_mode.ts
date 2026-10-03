/**
 * components/dns_record_management_mode.ts — the values of a DNS zone's
 * `recordManagement` (see `DnsZoneGuardrails.recordManagement`).
 */

/**
 * `'strict'` (the default): every record set the zone does not declare is
 * deleted. `'lax'`: record sets Fractal Cloud did not define are left alone.
 * `'authoritative'` is accepted as an alias of `'strict'` and sent as `'strict'`.
 */
export type DnsRecordManagement =
  | 'strict'
  | 'lax'
  /** @deprecated Use `'strict'`, which it is an alias of. */
  | 'authoritative';
