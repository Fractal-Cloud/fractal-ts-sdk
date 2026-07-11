/**
 * components/observability.ts — Observability domain Component factories (Level 1).
 *
 * Abstract, vendor-agnostic capability contracts:
 *   - Observability.Monitoring
 *   - Observability.Tracing
 *   - Observability.Logging
 *
 * Each agnostic parameter is a typed `.withXxx()` guardrail setter (locks the
 * key at design time). Built exclusively on the LOCKED engine in ../core.
 */
import {ComponentNode, NodeState, newNode, guardrail} from '../core';

// ── Observability.Monitoring ─────────────────────────────────────────────────
export type MonitoringNode<Id extends string = string> = ComponentNode<
  Id,
  'Observability.Monitoring'
> & {
  withRetentionDays: (v: number) => MonitoringNode<Id>;
  withScrapeInterval: (v: number) => MonitoringNode<Id>;
};
const monitoringNode = <Id extends string>(
  s: NodeState,
): MonitoringNode<Id> => ({
  state: s,
  withRetentionDays: v => monitoringNode<Id>(guardrail(s, 'retentionDays', v)),
  withScrapeInterval: v =>
    monitoringNode<Id>(guardrail(s, 'scrapeInterval', v)),
});
export const Monitoring = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): MonitoringNode<Id> =>
  monitoringNode<Id>(
    newNode(cfg.id, 'Observability.Monitoring', cfg.displayName),
  );

// ── Observability.Tracing ────────────────────────────────────────────────────
export type TracingNode<Id extends string = string> = ComponentNode<
  Id,
  'Observability.Tracing'
> & {
  withRetentionDays: (v: number) => TracingNode<Id>;
  withSamplingRate: (v: number) => TracingNode<Id>;
};
const tracingNode = <Id extends string>(s: NodeState): TracingNode<Id> => ({
  state: s,
  withRetentionDays: v => tracingNode<Id>(guardrail(s, 'retentionDays', v)),
  withSamplingRate: v => tracingNode<Id>(guardrail(s, 'samplingRate', v)),
});
export const Tracing = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): TracingNode<Id> =>
  tracingNode<Id>(newNode(cfg.id, 'Observability.Tracing', cfg.displayName));

// ── Observability.Logging ────────────────────────────────────────────────────
export type LoggingNode<Id extends string = string> = ComponentNode<
  Id,
  'Observability.Logging'
> & {
  withRetentionDays: (v: number) => LoggingNode<Id>;
};
const loggingNode = <Id extends string>(s: NodeState): LoggingNode<Id> => ({
  state: s,
  withRetentionDays: v => loggingNode<Id>(guardrail(s, 'retentionDays', v)),
});
export const Logging = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): LoggingNode<Id> =>
  loggingNode<Id>(newNode(cfg.id, 'Observability.Logging', cfg.displayName));
