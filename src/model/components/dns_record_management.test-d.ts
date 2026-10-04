/**
 * Type-level assertions for a DNS zone's `recordManagement`. Compile-time only:
 * `.test-d.ts` is checked by `npm run typecheck`, unlike `*.test.ts`, where a
 * `@ts-expect-error` is inert.
 */
import {DnsZoneComponent, type DnsZoneGuardrails} from './dns';
import type {DnsRecordManagement} from './dns_record_management_mode';

/** The two modes are values, and omitting the key is allowed. */
export const authoritative: DnsZoneGuardrails = {
  recordManagement: 'authoritative',
};
export const lax: DnsZoneGuardrails = {recordManagement: 'lax'};
export const omitted: DnsZoneGuardrails = {};

/** `'strict'` is not a value. */
export const strictValue: DnsZoneGuardrails = {
  // @ts-expect-error 'strict' is not a recordManagement value
  recordManagement: 'strict',
};

/** Per-record ownership is gone: `'additive'` is a type error. */
export const additive: DnsZoneGuardrails = {
  // @ts-expect-error 'additive' is not a recordManagement value
  recordManagement: 'additive',
};

export const builder = () => {
  DnsZoneComponent({id: 'z'}).withRecordManagement('authoritative');
  DnsZoneComponent({id: 'z'}).withRecordManagement('lax');
  /** A value typed with the exported type is accepted too. */
  const typed: DnsRecordManagement = authoritative.recordManagement ?? 'lax';
  DnsZoneComponent({id: 'z'}).withRecordManagement(typed);
  // @ts-expect-error 'strict' is not a recordManagement value
  DnsZoneComponent({id: 'z'}).withRecordManagement('strict');
  // @ts-expect-error 'additive' is not a recordManagement value
  DnsZoneComponent({id: 'z'}).withRecordManagement('additive');
};
