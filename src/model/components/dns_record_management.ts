/**
 * components/dns_record_management.ts — the rules the SDK applies to a DNS
 * zone's `recordManagement` itself, shared by the DNS Zone component and the
 * environment's DNS zones. Internal: not exported from the package.
 */

/**
 * What the SDK sends for a declared value. Cloud agents up to 8.21 accept only
 * `'authoritative'` and fail a zone carrying anything else, so `'strict'` (and
 * the alias itself) goes on the wire as `'authoritative'`, which every agent
 * reads as strict. Omitted is strict, so it is sent the same way: agents up to
 * 8.21 hold a zone that does not say, while later ones read it as strict, and
 * sending `'authoritative'` makes both behave alike. `'lax'` goes as chosen.
 * The SDK sends `'strict'` only once every agent accepts it, as a coordinated
 * change.
 */
export const wireRecordManagement = <T>(value: T): T | 'authoritative' =>
  value === 'strict' ? 'authoritative' : value;

/**
 * Why `value` cannot be a zone's `recordManagement`, or `undefined` when it can
 * (`'strict'`, `'lax'`, the deprecated `'authoritative'`, or omitted). Checked at
 * runtime too, for callers the type does not reach.
 */
export const recordManagementRefusal = (value: unknown): string | undefined => {
  if (
    value === undefined ||
    value === 'strict' ||
    value === 'lax' ||
    value === 'authoritative'
  ) {
    return undefined;
  }
  const shown =
    typeof value === 'string' ? `'${value}'` : JSON.stringify(value);
  const use =
    "Use 'strict' (every record set the zone does not declare is deleted; " +
    "the default when omitted) or 'lax' (record sets Fractal Cloud did not " +
    'define are left alone).';
  if (value === 'additive') {
    return (
      `recordManagement ${shown}: per-record ownership is no longer ` +
      `supported. ${use}`
    );
  }
  return `recordManagement ${shown} is not a value. ${use}`;
};
