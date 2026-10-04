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
import {allowBulkDeleteRefusal} from './dns_bulk_delete';
import {ComponentNode, NodeState, newNode, guardrail} from '../core';
import {recordManagementRefusal} from './dns_record_management';
import type {DnsRecordManagement} from './dns_record_management_mode';

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
  | {
      name?: string;
      type: DnsRecordType;
      ttl?: number;
      values: string[];
      alias?: never;
    }
  | {
      name?: string;
      type: 'A' | 'AAAA' | 'CNAME';
      alias: DnsAliasTarget;
      values?: never;
      ttl?: never;
    };

/** The shared guardrails of a DNS zone, with the agent's defaults. */
export type DnsZoneGuardrails = {
  /** `private` = resolvable only inside the environment networks. Default `public`. */
  visibility?: 'public' | 'private';
  /** `required` signs or fails; `optional` signs when possible. Default `disabled`. */
  dnssec?: 'required' | 'optional' | 'disabled';
  /**
   * How the zone treats record sets its declaration does not list. Nothing is
   * written into the zone's DNS data to say which record sets Fractal Cloud
   * manages; the agent remembers what it applied in control-plane state (the
   * zone's `managedRecords`).
   *
   * - `authoritative` (the default, also when omitted): the declaration is the
   *   whole zone. Every record set it does not declare is deleted (apex NS and SOA
   *   aside), whoever created it.
   * - `lax`: record sets Fractal Cloud did not define are left alone (an ACME
   *   DNS-01 `_acme-challenge` TXT written by cert-manager or certbot survives).
   *   The declared record sets are still kept: changed or removed outside
   *   Fractal Cloud, they are put back, and a declared name and type that
   *   already exists with other values is set to the declared ones. A record
   *   set removed from the declaration is deleted only if it is in the
   *   last-applied set (`managedRecords`) the previous pass recorded; if that
   *   state is lost, the record set is left in place.
   *
   * The value is sent exactly as chosen; when omitted, nothing is sent.
   * `'additive'` (per-record ownership) is no longer supported: this SDK
   * refuses it, as do the control plane and the agents.
   */
  recordManagement?: DnsRecordManagement;
  /** Default A, AAAA, CAA, CNAME, MX, NS, PTR, SRV, TXT. */
  allowedRecordTypes?: DnsRecordType[];
  /** Inclusive TTL bounds in seconds. Default 0 / 604800. */
  minTtl?: number;
  maxTtl?: number;
  /** CAs allowed to issue for the domain, published as the apex CAA set. */
  caaIssuers?: string[];
  /** Whether NS records below the apex may be declared. Default false. */
  allowSubdomainDelegation?: boolean;
  /**
   * One-shot override of the agents' mass-delete guard. Default false: an agent
   * refuses a pass that would delete at least 3 record sets AND more than half
   * of the zone, and reports it instead of deleting. `true` lets one such pass
   * through. It applies once per declaration change: the agent records a
   * fingerprint of the declaration when it applies a bulk delete, and while the
   * declaration stays the same the guard applies again and the agent reports
   * that the flag should be removed. Remove it afterwards.
   *
   * Accepted only by cloud agents v8.22.0 and later.
   */
  allowBulkDelete?: boolean;
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
  /**
   * The last-applied set: the record sets the previous pass applied, as
   * `"<fqdn with trailing dot> <TYPE>"` (`"www.example.com. A"`). Kept in
   * control-plane state, never in the zone's DNS data; under `lax` a record set
   * removed from the declaration is deleted only if it is listed here.
   */
  managedRecords?: string[];
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
  /** `'authoritative'` (the default when never called) or `'lax'`. */
  withRecordManagement: (v: DnsRecordManagement) => DnsZoneComponentNode<Id>;
  withAllowedRecordTypes: (v: DnsRecordType[]) => DnsZoneComponentNode<Id>;
  withTtlBounds: (v: {
    minTtl?: number;
    maxTtl?: number;
  }) => DnsZoneComponentNode<Id>;
  withCaaIssuers: (v: string[]) => DnsZoneComponentNode<Id>;
  withSubdomainDelegation: (v: boolean) => DnsZoneComponentNode<Id>;
  /** See `DnsZoneGuardrails.allowBulkDelete` (cloud agents v8.22.0 and later). */
  withAllowBulkDelete: (v: boolean) => DnsZoneComponentNode<Id>;
};
const dnsZoneNode = <Id extends string>(
  s: NodeState,
): DnsZoneComponentNode<Id> => ({
  state: s,
  withDomainName: v => dnsZoneNode<Id>(guardrail(s, 'domainName', v)),
  withRecords: v => dnsZoneNode<Id>(guardrail(s, 'records', v)),
  withVisibility: v => dnsZoneNode<Id>(guardrail(s, 'visibility', v)),
  withDnssec: v => dnsZoneNode<Id>(guardrail(s, 'dnssec', v)),
  withRecordManagement: v => {
    const refusal = recordManagementRefusal(v);
    if (refusal !== undefined) {
      throw new Error(`withRecordManagement: ${refusal}`);
    }
    return dnsZoneNode<Id>(guardrail(s, 'recordManagement', v));
  },
  withAllowedRecordTypes: v =>
    dnsZoneNode<Id>(guardrail(s, 'allowedRecordTypes', v)),
  withTtlBounds: v => {
    if (v.minTtl === undefined && v.maxTtl === undefined) {
      throw new Error('withTtlBounds needs minTtl, maxTtl or both');
    }
    if (
      v.minTtl !== undefined &&
      v.maxTtl !== undefined &&
      v.minTtl > v.maxTtl
    ) {
      throw new Error(
        `withTtlBounds: minTtl (${v.minTtl}) is greater than maxTtl (${v.maxTtl})`,
      );
    }
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
  withAllowBulkDelete: v => {
    const refusal = allowBulkDeleteRefusal(v);
    if (refusal !== undefined) {
      throw new Error(`withAllowBulkDelete: ${refusal}`);
    }
    return dnsZoneNode<Id>(guardrail(s, 'allowBulkDelete', v));
  },
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
