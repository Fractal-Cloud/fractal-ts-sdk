/**
 * components/dns_record_management.ts — the one rule the SDK applies to a DNS
 * zone's `recordManagement` itself, shared by the DNS Zone component and the
 * environment's DNS zones. Internal: not exported from the package.
 */

/**
 * Why `value` cannot be a zone's `recordManagement`, or `undefined` when it can
 * (`'authoritative'`, or omitted). Checked at runtime too, for callers the type
 * does not reach.
 */
export const recordManagementRefusal = (value: unknown): string | undefined => {
  if (value === undefined || value === 'authoritative') {
    return undefined;
  }
  const shown =
    typeof value === 'string' ? `'${value}'` : JSON.stringify(value);
  return (
    `recordManagement ${shown}: per-record ownership isn't supported yet; ` +
    'zones are managed authoritatively. Use ' +
    "'authoritative' (every record set the zone does not declare is deleted), " +
    'or omit it.'
  );
};
