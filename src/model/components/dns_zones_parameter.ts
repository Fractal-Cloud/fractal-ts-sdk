/**
 * components/dns_zones_parameter.ts — `withDnsZones`, shared by every component
 * that may ask for access to environment DNS zones. Internal: not re-exported
 * from the model barrel.
 */
import {openDefault, type NodeState} from '../core';
import {dnsZoneRequestsProblem} from './dns_zone_access_problem';
import type {DnsZoneAccessRequest} from './dns_zone_access_request';

/**
 * Sets the component's `dnsZones` as an OPEN default, not a guardrail: which
 * zones exist depends on the environment a Live System runs in, so an
 * operation may still change them. Refuses, as the control plane would, a
 * list it cannot read without guessing.
 */
export const withDnsZonesParameter = (
  s: NodeState,
  zones: readonly DnsZoneAccessRequest[],
): NodeState => {
  const problem = dnsZoneRequestsProblem(zones);
  if (problem !== undefined) {
    throw new Error(`withDnsZones: ${problem}.`);
  }
  return openDefault(
    s,
    'dnsZones',
    zones.map(z => ({name: z.name, access: {...z.access}})),
  );
};
