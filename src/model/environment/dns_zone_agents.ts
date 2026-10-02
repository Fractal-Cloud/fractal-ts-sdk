/**
 * environment/dns_zone_agents.ts — the agents a declared DNS zone selects to
 * host it (`agents`). Selecting is optional; omitted, every agent of the
 * environment that hosts DNS zones hosts its own copy. Which agents host DNS
 * zones is what each agent declares to the control plane, so nothing here knows
 * an agent type: this checks only what can be known before anything is sent,
 * and the control plane checks the rest when the environment is written.
 */
import {agentIdOf} from './cloud_agents';
import type {CloudAccount, CloudAgent} from './cloud_agents';
import type {DnsZone, DnsZoneAgent} from './types';

/**
 * `{type}` or `{type}:{shortName}`: a type name (letters, digits, `_`, `-`) and
 * optionally a short name without whitespace, commas or colons. Agent ids
 * compare ignoring case, so they are sent in lower case.
 */
const AGENT_ID = /^[a-z][a-z0-9_-]*(:[^\s,:]+)?$/;

/**
 * The id a selection entry names, in the form the control plane keys agents by
 * (lower case), or `undefined` when a string entry is not an agent id.
 */
const idOf = (agent: DnsZoneAgent): string | undefined => {
  if (typeof agent !== 'string') {
    return agentIdOf(agent);
  }
  const id = agent.trim().toLowerCase();
  return AGENT_ID.test(id) ? id : undefined;
};

/** A zone's `agents` as sent: each agent id once, in the order first selected. */
export const dnsZoneAgentIds = (zone: DnsZone): string[] | undefined =>
  zone.agents === undefined
    ? undefined
    : [
        ...new Set(
          zone.agents.map(idOf).filter((id): id is string => id !== undefined),
        ),
      ];

/**
 * Errors for `zones` declared on an environment whose agents (or operational
 * cloud accounts) are `declared`, each prefixed with `label`: an empty
 * selection, an entry that is not an agent id, an agent object the environment
 * does not declare, and `dnssec: 'required'` on several selected agents. An id
 * string is not checked against the environment: an agent registered outside
 * this tree (an ARIA agent) is the environment's too, and the control plane,
 * which knows them all, refuses one it does not have.
 */
export const validateDnsZoneAgents = (
  label: string,
  zones: readonly DnsZone[],
  declared: readonly (CloudAgent | CloudAccount)[],
): string[] => {
  const declaredIds = new Set(declared.map(agentIdOf));
  const errors: string[] = [];
  for (const zone of zones) {
    if (zone.agents === undefined) {
      continue;
    }
    const at = `${label}: DNS zone '${zone.name}'`;
    if (zone.agents.length === 0) {
      errors.push(
        `${at}: agents is empty; omit it to use every agent that hosts DNS zones.`,
      );
      continue;
    }
    const invalid = zone.agents.filter(a => idOf(a) === undefined);
    if (invalid.length > 0) {
      errors.push(
        `${at}: '${invalid.join("', '")}' is not an agent id; write {type} or ` +
          '{type}:{shortName}, e.g. aws or aria:caas-k8s, or pass the declared agent.',
      );
      continue;
    }
    const undeclared = zone.agents
      .filter(a => typeof a !== 'string')
      .map(idOf)
      .filter((id): id is string => id !== undefined && !declaredIds.has(id));
    if (undeclared.length > 0) {
      errors.push(
        `${at} selects agent '${[...new Set(undeclared)].join("', '")}', which this ` +
          'environment does not declare (no such cloud agent or cloud account).',
      );
    }
    const hosts = dnsZoneAgentIds(zone) ?? [];
    if (zone.dnssec === 'required' && hosts.length > 1) {
      errors.push(
        `${at} has dnssec 'required' and selects several agents (${hosts.join(', ')}): ` +
          'one zone signed by several agents needs multi-signer DNSSEC (RFC 8901), which is not ' +
          "supported. Select one agent, or use dnssec 'optional' (served unsigned) or 'disabled'.",
      );
    }
  }
  return errors;
};
