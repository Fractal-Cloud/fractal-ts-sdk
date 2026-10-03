/**
 * environment/dns_zone_record_management.ts — refuses, before anything is sent,
 * a declared DNS zone asking for per-record ownership, which neither the
 * control plane nor the agents support.
 */
import {recordManagementRefusal} from '../components/dns_record_management';
import type {DnsZone} from './types';

/** Why each of `zones` cannot be declared as it is, prefixed with `label`. */
export const validateDnsZoneRecordManagement = (
  label: string,
  zones: readonly DnsZone[],
): string[] => {
  const errors: string[] = [];
  for (const zone of zones) {
    const refusal = recordManagementRefusal(
      (zone as {recordManagement?: unknown}).recordManagement,
    );
    if (refusal !== undefined) {
      errors.push(`${label}: DNS zone '${zone.name}': ${refusal}`);
    }
  }
  return errors;
};
