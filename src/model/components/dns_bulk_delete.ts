/**
 * components/dns_bulk_delete.ts — the shared check of `allowBulkDelete`, the
 * one-shot override of the agents' DNS mass-delete guard. Internal: not
 * re-exported from the model barrel.
 */

/** Why `value` cannot be an `allowBulkDelete`, or undefined when it can (or is absent). */
export const allowBulkDeleteRefusal = (value: unknown): string | undefined =>
  value === undefined || typeof value === 'boolean'
    ? undefined
    : `allowBulkDelete must be true or false, got ${JSON.stringify(value)}`;
