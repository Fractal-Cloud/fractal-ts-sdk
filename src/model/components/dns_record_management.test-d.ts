/**
 * Type-level assertions for a DNS zone's `recordManagement`. Compile-time only:
 * `.test-d.ts` is checked by `npm run typecheck`, unlike `*.test.ts`, where a
 * `@ts-expect-error` is inert.
 */
import {DnsZoneComponent, type DnsZoneGuardrails} from './dns';

/** The two modes, and the deprecated alias of strict, are values. */
export const strict: DnsZoneGuardrails = {recordManagement: 'strict'};
export const lax: DnsZoneGuardrails = {recordManagement: 'lax'};
export const authoritative: DnsZoneGuardrails = {
  recordManagement: 'authoritative',
};
export const omitted: DnsZoneGuardrails = {};

/** Per-record ownership is gone: `'additive'` is a type error. */
export const additive: DnsZoneGuardrails = {
  // @ts-expect-error 'additive' is not a recordManagement value
  recordManagement: 'additive',
};

export const builder = () => {
  DnsZoneComponent({id: 'z'}).withRecordManagement('strict');
  DnsZoneComponent({id: 'z'}).withRecordManagement('lax');
  DnsZoneComponent({id: 'z'}).withRecordManagement('authoritative');
  // @ts-expect-error 'additive' is not a recordManagement value
  DnsZoneComponent({id: 'z'}).withRecordManagement('additive');
};
