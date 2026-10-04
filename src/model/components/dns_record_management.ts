/**
 * components/dns_record_management.ts — the rules the SDK applies to a DNS
 * zone's `recordManagement` itself, shared by the DNS Zone component and the
 * environment's DNS zones. Internal: not exported from the package.
 */

/**
 * Why `value` cannot be a zone's `recordManagement`, or `undefined` when it can
 * (`'authoritative'`, `'lax'`, or omitted). Checked at runtime too, for callers
 * the type does not reach. The value is sent exactly as chosen.
 */
export const recordManagementRefusal = (value: unknown): string | undefined => {
  if (value === undefined || value === 'authoritative' || value === 'lax') {
    return undefined;
  }
  const shown =
    typeof value === 'string' ? `'${value}'` : JSON.stringify(value);
  const use =
    "Use 'authoritative' (every record set the zone does not declare is " +
    "deleted; the default when omitted) or 'lax' (record sets Fractal Cloud " +
    'did not define are left alone).';
  if (value === 'additive') {
    return (
      `recordManagement ${shown}: per-record ownership is no longer ` +
      `supported. ${use}`
    );
  }
  return `recordManagement ${shown} is not a value. ${use}`;
};
