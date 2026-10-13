/**
 * environment/dns_zone_component_access.ts — refuses, before anything is sent,
 * a declared DNS zone whose `componentAccess` ceiling the control plane could
 * not read without guessing.
 */
import {dnsZoneAccessProblem} from '../components/dns_zone_access_problem';
import type {DnsZone} from './types';

/** Why each of `zones` cannot be declared as it is, prefixed with `label`. */
export const validateDnsZoneComponentAccess = (
  label: string,
  zones: readonly DnsZone[],
): string[] => {
  const errors: string[] = [];
  for (const zone of zones) {
    const problem = dnsZoneAccessProblem(zone.componentAccess, 'ceiling');
    if (problem !== undefined) {
      errors.push(
        `${label}: DNS zone '${zone.name}': componentAccess ${problem}.`,
      );
    }
  }
  return errors;
};
