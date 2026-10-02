/**
 * environment/dns_zone_result_status.ts — where one provider's copy of a DNS
 * zone stands.
 */

/**
 * - `Pending`: assigned to the provider, whose agent has not reported yet.
 * - `Realizing`: being created or brought in line with its declaration.
 * - `Active`: matches its declaration; `zoneId`, `nameServers` and `dsRecords`
 *   are current.
 * - `Failed`: refused (a guardrail violation) or the provider failed; see the
 *   message.
 * - `Deleting`: no longer declared for the provider and being torn down, or its
 *   teardown is blocked (see the message).
 * - `ManualOverride`: a zone of that name exists but is not the agent's to
 *   change; reported only.
 *
 * A status the control plane adds later is passed through as it spells it.
 */
export type DnsZoneResultStatus =
  | 'Pending'
  | 'Realizing'
  | 'Active'
  | 'Failed'
  | 'Deleting'
  | 'ManualOverride'
  | (string & {});
