/**
 * offers/observability.ts — Observability domain Offers (Catalogue, Level 3).
 *
 * Concrete implementations declaring which abstract Observability Component each
 * satisfies. Vendor knobs live in each offer's config only. These are all
 * vendor-neutral self-hosted CaaS offers (Prometheus/Jaeger/Elastic on any
 * cluster), so they omit `provider`.
 */
import {defineOffer} from '../core';

// ── Observability.Monitoring offers ──────────────────────────────────────────
export const Prometheus = defineOffer<
  'Observability.Monitoring',
  {namespace?: string}
>({
  satisfies: 'Observability.Monitoring',
  offerType: 'Observability.CaaS.Prometheus',
  deliveryModel: 'CaaS',
});

// ── Observability.Tracing offers ─────────────────────────────────────────────
export const Jaeger = defineOffer<
  'Observability.Tracing',
  {namespace?: string}
>({
  satisfies: 'Observability.Tracing',
  offerType: 'Observability.CaaS.Jaeger',
  deliveryModel: 'CaaS',
});

// ── Observability.Logging offers ─────────────────────────────────────────────
export const ObservabilityElastic = defineOffer<
  'Observability.Logging',
  {namespace?: string; elasticVersion?: string}
>({
  satisfies: 'Observability.Logging',
  offerType: 'Observability.CaaS.Elastic',
  deliveryModel: 'CaaS',
});
