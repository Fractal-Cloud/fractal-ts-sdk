/**
 * Type-level assertions for a DNS zone's `allowBulkDelete`. Compile-time only:
 * `.test-d.ts` is checked by `npm run typecheck`, unlike `*.test.ts`, where a
 * `@ts-expect-error` is inert.
 */
import {DnsZoneComponent, type DnsZoneGuardrails} from './dns';

/** A boolean, and optional: omitted, nothing is sent and the agent guards bulk deletes. */
export const allowed: DnsZoneGuardrails = {allowBulkDelete: true};
export const guarded: DnsZoneGuardrails = {allowBulkDelete: false};
export const omitted: DnsZoneGuardrails = {};

export const notABoolean: DnsZoneGuardrails = {
  // @ts-expect-error 'true' is a string, not a boolean
  allowBulkDelete: 'true',
};

export const builder = () => {
  DnsZoneComponent({id: 'z'}).withAllowBulkDelete(true);
  DnsZoneComponent({id: 'z'}).withAllowBulkDelete(false);
  // @ts-expect-error 'true' is a string, not a boolean
  DnsZoneComponent({id: 'z'}).withAllowBulkDelete('true');
  // @ts-expect-error the flag takes a value
  DnsZoneComponent({id: 'z'}).withAllowBulkDelete();
};
