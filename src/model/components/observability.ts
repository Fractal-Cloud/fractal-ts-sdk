/**
 * components/observability.ts — Observability domain Component factories (Level 1).
 *
 * Abstract, vendor-agnostic capability contracts:
 *   - Observability.Monitoring
 *   - Observability.Tracing
 *   - Observability.Logging
 *   - Observability.LogShipper
 *
 * Each agnostic parameter is a typed `.withXxx()` guardrail setter (locks the
 * key at design time). Built exclusively on the LOCKED engine in ../core.
 */
import {
  AnyNode,
  ComponentNode,
  NodeState,
  addDependency,
  guardrail,
  newNode,
} from '../core';

// ── Observability.Monitoring ─────────────────────────────────────────────────
export type MonitoringNode<Id extends string = string> = ComponentNode<
  Id,
  'Observability.Monitoring'
> & {
  withRetentionDays: (v: number) => MonitoringNode<Id>;
  /**
   * @deprecated No agent reads `scrapeInterval` and no offer declares it, so every
   * Monitoring offer refuses a Live System that sets it rather than letting the
   * platform drop it. Scrape intervals belong to the scraping offer's own config.
   */
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
  /**
   * @deprecated No agent reads `samplingRate` and no offer declares it, so every
   * Tracing offer refuses a Live System that sets it rather than letting the
   * platform drop it. Sampling is decided by the instrumented workloads.
   */
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

// ── Observability.LogShipper ─────────────────────────────────────────────────
/**
 * A log shipper: collects the logs of the container platform it runs on and
 * forwards them to a logging backend. It stores nothing, so it is not a
 * `Logging` component and has no retention.
 *
 * Its one blueprint dependency is the `ContainerPlatform` it runs on
 * (`dependsOn(platform)`). Where it ships to is configured on the selected
 * offer.
 */
export type LogShipperNode<Id extends string = string> = ComponentNode<
  Id,
  'Observability.LogShipper'
> & {
  dependsOn: (other: AnyNode) => LogShipperNode<Id>;
};
const logShipperNode = <Id extends string>(
  s: NodeState,
): LogShipperNode<Id> => ({
  state: s,
  dependsOn: other => logShipperNode<Id>(addDependency(s, other.state.id)),
});
export const LogShipper = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): LogShipperNode<Id> =>
  logShipperNode<Id>(
    newNode(cfg.id, 'Observability.LogShipper', cfg.displayName),
  );
