/**
 * Type-level assertions for the caas-k8s observability offers' config types, checked by `npm run
 * typecheck` (see storage.test-d.ts for why these are not in a `.test.ts`).
 */
import {
  Grafana,
  GrafanaAlloy,
  GrafanaLoki,
  GrafanaTempo,
  Jaeger,
  KubePrometheusStack,
  SqsExporter,
} from './observability';
import type {Offer} from '../core';
import {secretRef} from '../secret';

// ── SqsExporter: every key is optional; the lists are lists ──────────────────
SqsExporter({});
SqsExporter({
  namespace: 'monitoring',
  queueUrls: ['https://sqs.eu-central-1.amazonaws.com/123456789012/orders'],
  monitorIntervalSeconds: 30,
  image: 'registry.example.com/sqs-exporter:1.0.0',
  imagePullSecrets: ['dockerhub'],
  nodeSelector: {'kubernetes.io/arch': 'arm64'},
});
SqsExporter({
  // @ts-expect-error `queueUrls` is a list, even of one queue.
  queueUrls: 'https://sqs.eu-central-1.amazonaws.com/123456789012/orders',
});
// @ts-expect-error `imagePullSecrets` is a list.
SqsExporter({imagePullSecrets: 'dockerhub'});
// @ts-expect-error `monitorIntervalSeconds` is a number of seconds.
SqsExporter({monitorIntervalSeconds: '30'});
// @ts-expect-error `nodeSelector` values are strings.
SqsExporter({nodeSelector: {spot: true}});

// ── KubePrometheusStack: the Grafana stack keys ──────────────────────────────
KubePrometheusStack({});
KubePrometheusStack({
  namespace: 'monitoring',
  storageClassName: 'fractal-gp3',
  prometheusStorageGi: 50,
  lokiUrl: 'none',
  tempoUrl: 'http://tempo.monitoring.svc.cluster.local:3200',
  alertRules: {dlq: {groups: []}},
  alertmanagerConfig: {route: {receiver: 'null'}},
  values: {grafana: {replicas: 1}},
});
// caas-k8s v2.0.0: the stack reads no environment secrets; Google sign-in is
// the Grafana offer's.
KubePrometheusStack({
  // @ts-expect-error secretEnv was removed with caas-k8s v2.0.0.
  secretEnv: {GF_AUTH_GOOGLE_CLIENT_SECRET: secretRef('grafana-google')},
});
// @ts-expect-error environmentSecretShortNames was removed with caas-k8s v2.0.0.
KubePrometheusStack({environmentSecretShortNames: ['grafana-google']});
// @ts-expect-error the stack reads no environment secrets, so it has no selection.
KubePrometheusStack({}).withEnvironmentSecrets(['grafana-google']);
KubePrometheusStack({bundledGrafana: false});
// @ts-expect-error `bundledGrafana` is a boolean.
KubePrometheusStack({bundledGrafana: 'no'});
// @ts-expect-error `prometheusStorageGi` is a number of GiB.
KubePrometheusStack({prometheusStorageGi: '50'});
// @ts-expect-error `retentionDays` is the component's `withRetentionDays`, not an offer key.
KubePrometheusStack({retentionDays: 15});
// @ts-expect-error `scrapeInterval` is read by no agent and is refused.
KubePrometheusStack({scrapeInterval: '30s'});

// ── GrafanaLoki and GrafanaTempo share the object-storage backend keys ───────
GrafanaLoki({});
GrafanaLoki({
  namespace: 'monitoring',
  storageClassName: 'fractal-gp3',
  values: {},
});
GrafanaTempo({});
GrafanaTempo({
  namespace: 'monitoring',
  storageClassName: 'fractal-gp3',
  values: {},
});
// @ts-expect-error the bucket is a link to an `AwsS3` component, not a key.
GrafanaLoki({bucketName: 'loki-chunks'});
// @ts-expect-error the bucket is a link to an `AwsS3` component, not a key.
GrafanaTempo({bucketName: 'tempo-traces'});
// @ts-expect-error `samplingRate` is read by no agent and is refused.
GrafanaTempo({samplingRate: 0.1});

// ── Grafana: a Visualization offer, Google sign-in ───────────────────────────
// @ts-expect-error googleClientId and allowedDomains are required.
Grafana({});
Grafana({
  googleClientId: '123456789012-abcdefghijklmnop.apps.googleusercontent.com',
  allowedDomains: ['example.com'],
  hostedDomain: 'example.com',
  admins: ['ops@example.com'],
  plugins: ['yesoreyeram-infinity-datasource 4.1.3'],
  secretEnv: {
    GF_AUTH_GOOGLE_CLIENT_SECRET: secretRef('grafana-google-client-secret'),
  },
  // As the contract generates them: objects, shapes checked by the agent.
  dashboards: {d: {dashboard: {title: 'D'}}},
  datasources: {p: {type: 'infinity', allowedHosts: ['https://a.example/']}},
}).withEnvironmentSecrets(['grafana-google-client-secret']);
Grafana({
  googleClientId: '1-a.apps.googleusercontent.com',
  allowedDomains: ['example.com'],
  // @ts-expect-error a secretEnv value is a secretRef, never the secret itself.
  secretEnv: {GF_AUTH_GOOGLE_CLIENT_SECRET: 'hunter2'},
});
Grafana({
  googleClientId: '1-a.apps.googleusercontent.com',
  allowedDomains: ['example.com'],
  // @ts-expect-error Grafana reads only GF_AUTH_GOOGLE_CLIENT_SECRET from secrets.
  secretEnv: {GF_AUTH_ANONYMOUS_ENABLED: secretRef('x')},
});
// @ts-expect-error secretEnv is required: Google sign-in needs the client secret.
Grafana({
  googleClientId: '1-a.apps.googleusercontent.com',
  allowedDomains: ['example.com'],
});
Grafana({
  googleClientId: '1-a.apps.googleusercontent.com',
  allowedDomains: ['example.com'],
  // @ts-expect-error secretEnv must hold GF_AUTH_GOOGLE_CLIENT_SECRET.
  secretEnv: {},
});
export const grafanaIsAVisualization: Offer<'Observability.Visualization'> =
  Grafana({
    googleClientId: '1-a.apps.googleusercontent.com',
    allowedDomains: [],
    secretEnv: {GF_AUTH_GOOGLE_CLIENT_SECRET: secretRef('x')},
  });

// ── GrafanaAlloy ──────────────────────────────────────────────────────────────
GrafanaAlloy({});
GrafanaAlloy({
  namespace: 'monitoring',
  lokiPushUrl: 'http://loki.monitoring.svc.cluster.local:3100/loki/api/v1/push',
  values: {},
});
GrafanaAlloy({
  // @ts-expect-error `pushUrl` is Loki's output; Alloy's key is `lokiPushUrl`.
  pushUrl: 'http://loki.monitoring.svc.cluster.local:3100/loki/api/v1/push',
});

// ── GrafanaAlloy satisfies LogShipper, not Logging ────────────────────────────
export const alloyIsALogShipper: Offer<'Observability.LogShipper'> =
  GrafanaAlloy({});
// @ts-expect-error Alloy ships logs; it is not a Logging backend.
export const alloyIsNotLogging: Offer<'Observability.Logging'> = GrafanaAlloy(
  {},
);

// ── Jaeger: its traces are in the OpenSearch it links to ─────────────────────
Jaeger({});
Jaeger({namespace: 'tracing'});
// @ts-expect-error `storageSettings` is gone: link Jaeger to a StorageOpenSearch.
Jaeger({storageSettings: {}});
// @ts-expect-error `storageClassName` is gone: OpenSearch holds the volumes.
Jaeger({storageClassName: 'gp3'});
