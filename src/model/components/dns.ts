/**
 * components/dns.ts — the DNS Zone Component (Level 1) and its guardrails.
 *
 * DNS zones are normally declared on the environment (`withDnsZones`); this
 * component is the atom every DNS zone offer implements, and using it directly
 * in a Live System is advanced and unsupported.
 *
 * The guardrails are vendor-neutral and every DNS zone offer (Route 53, Cloud
 * DNS, Azure DNS) enforces the same keys: a declared record outside them is
 * refused by the agent, never adjusted.
 */
import {ComponentNode, NodeState, newNode, guardrail} from '../core';

/** Record types a DNS zone may declare (SOA always belongs to the provider). */
export type DnsRecordType =
  | 'A'
  | 'AAAA'
  | 'CAA'
  | 'CNAME'
  | 'DS'
  | 'MX'
  | 'NAPTR'
  | 'NS'
  | 'PTR'
  | 'SPF'
  | 'SRV'
  | 'TXT';

/** Target of an alias record (A / AAAA / CNAME) instead of values. */
export type DnsAliasTarget = {
  dnsName: string;
  hostedZoneId: string;
  evaluateTargetHealth?: boolean;
};

/**
 * One record set. `name` is relative to the zone (`www`), `@` or empty for the
 * apex, or fully qualified. TXT values are given unquoted. Exactly one of
 * `values` and `alias`.
 */
export type DnsRecord =
  | {name?: string; type: DnsRecordType; ttl?: number; values: string[]}
  | {name?: string; type: 'A' | 'AAAA' | 'CNAME'; alias: DnsAliasTarget};

/** The shared guardrails of a DNS zone, with the agent's defaults. */
export type DnsZoneGuardrails = {
  /** `private` = resolvable only inside the environment networks. Default `public`. */
  visibility?: 'public' | 'private';
  /** `required` signs or fails; `optional` signs when possible. Default `disabled`. */
  dnssec?: 'required' | 'optional' | 'disabled';
  /** `authoritative` deletes undeclared record sets. Default `additive`. */
  recordManagement?: 'authoritative' | 'additive';
  /** Default A, AAAA, CAA, CNAME, MX, NS, PTR, SRV, TXT. */
  allowedRecordTypes?: DnsRecordType[];
  /** Inclusive TTL bounds in seconds. Default 0 / 604800. */
  minTtl?: number;
  maxTtl?: number;
  /** CAs allowed to issue for the domain, published as the apex CAA set. */
  caaIssuers?: string[];
  /** Whether NS records below the apex may be declared. Default false. */
  allowSubdomainDelegation?: boolean;
};

/** Output fields every DNS zone offer publishes. */
export type DnsZoneOutputs = {
  zoneId: string;
  nameServers: string[];
  /** Present once the zone is signed and serving signatures. */
  dsRecords?: {
    keyTag: number;
    algorithm: number;
    digestType: number;
    digest: string;
  }[];
};

// ── NetworkAndCompute.DnsZone ────────────────────────────────────────────────
export type DnsZoneComponentNode<Id extends string = string> = ComponentNode<
  Id,
  'NetworkAndCompute.DnsZone'
> & {
  withDomainName: (v: string) => DnsZoneComponentNode<Id>;
  withRecords: (v: DnsRecord[]) => DnsZoneComponentNode<Id>;
  withVisibility: (v: 'public' | 'private') => DnsZoneComponentNode<Id>;
  withDnssec: (
    v: 'required' | 'optional' | 'disabled',
  ) => DnsZoneComponentNode<Id>;
  withRecordManagement: (
    v: 'authoritative' | 'additive',
  ) => DnsZoneComponentNode<Id>;
  withAllowedRecordTypes: (v: DnsRecordType[]) => DnsZoneComponentNode<Id>;
  withTtlBounds: (v: {
    minTtl?: number;
    maxTtl?: number;
  }) => DnsZoneComponentNode<Id>;
  withCaaIssuers: (v: string[]) => DnsZoneComponentNode<Id>;
  withSubdomainDelegation: (v: boolean) => DnsZoneComponentNode<Id>;
};
const dnsZoneNode = <Id extends string>(
  s: NodeState,
): DnsZoneComponentNode<Id> => ({
  state: s,
  withDomainName: v => dnsZoneNode<Id>(guardrail(s, 'domainName', v)),
  withRecords: v => dnsZoneNode<Id>(guardrail(s, 'records', v)),
  withVisibility: v => dnsZoneNode<Id>(guardrail(s, 'visibility', v)),
  withDnssec: v => dnsZoneNode<Id>(guardrail(s, 'dnssec', v)),
  withRecordManagement: v =>
    dnsZoneNode<Id>(guardrail(s, 'recordManagement', v)),
  withAllowedRecordTypes: v =>
    dnsZoneNode<Id>(guardrail(s, 'allowedRecordTypes', v)),
  withTtlBounds: v => {
    let next = s;
    if (v.minTtl !== undefined) {
      next = guardrail(next, 'minTtl', v.minTtl);
    }
    if (v.maxTtl !== undefined) {
      next = guardrail(next, 'maxTtl', v.maxTtl);
    }
    return dnsZoneNode<Id>(next);
  },
  withCaaIssuers: v => dnsZoneNode<Id>(guardrail(s, 'caaIssuers', v)),
  withSubdomainDelegation: v =>
    dnsZoneNode<Id>(guardrail(s, 'allowSubdomainDelegation', v)),
});
/**
 * Named `DnsZoneComponent` because `DnsZone` is already the environment's DNS
 * zone entry type (`withDnsZones`).
 */
export const DnsZoneComponent = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): DnsZoneComponentNode<Id> =>
  dnsZoneNode<Id>(
    newNode(cfg.id, 'NetworkAndCompute.DnsZone', cfg.displayName),
  );
