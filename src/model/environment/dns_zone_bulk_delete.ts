/**
 * environment/dns_zone_bulk_delete.ts — refuses, before anything is sent, a
 * declared DNS zone whose `allowBulkDelete` is not a boolean.
 */
import {allowBulkDeleteRefusal} from '../components/dns_bulk_delete';
import type {DnsZone} from './types';

/** Why each of `zones` cannot be declared as it is, prefixed with `label`. */
export const validateDnsZoneBulkDelete = (
  label: string,
  zones: readonly DnsZone[],
): string[] => {
  const errors: string[] = [];
  for (const zone of zones) {
    const refusal = allowBulkDeleteRefusal(
      (zone as {allowBulkDelete?: unknown}).allowBulkDelete,
    );
    if (refusal !== undefined) {
      errors.push(`${label}: DNS zone '${zone.name}': ${refusal}`);
    }
  }
  return errors;
};
