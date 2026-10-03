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

// ── caas-k8s Grafana stack (Helm, on any Kubernetes cluster) ─────────────────
// Offers only: the BFF static catalog owns the services they sit under
// (`Observability.CaaS.Prometheus`, `.Loki`, `.Alloy`, `.Tempo`).

/** kube-prometheus-stack: Prometheus, Alertmanager and Grafana. */
export const KubePrometheusStack = defineOffer<
  'Observability.Monitoring',
  {namespace?: string}
>({
  satisfies: 'Observability.Monitoring',
  offerType: 'Observability.CaaS.KubePrometheusStack',
  deliveryModel: 'CaaS',
});

/**
 * Grafana Loki. Its chunks live in object storage: link it to a bucket
 * (`ObjectStorageLink`, `access: 'read-write'`) and the agent grants its
 * service account access.
 */
export const GrafanaLoki = defineOffer<
  'Observability.Logging',
  {namespace?: string}
>({
  satisfies: 'Observability.Logging',
  offerType: 'Observability.CaaS.GrafanaLoki',
  deliveryModel: 'CaaS',
});

/** Grafana Alloy as a DaemonSet, shipping the cluster's logs to Loki. */
export const GrafanaAlloy = defineOffer<
  'Observability.Logging',
  {namespace?: string}
>({
  satisfies: 'Observability.Logging',
  offerType: 'Observability.CaaS.GrafanaAlloy',
  deliveryModel: 'CaaS',
});

/** Grafana Tempo, with its traces in object storage (linked like Loki). */
export const GrafanaTempo = defineOffer<
  'Observability.Tracing',
  {namespace?: string}
>({
  satisfies: 'Observability.Tracing',
  offerType: 'Observability.CaaS.GrafanaTempo',
  deliveryModel: 'CaaS',
});
