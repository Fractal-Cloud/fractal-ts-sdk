/**
 * Type-level assertions for the caas-k8s observability offers' config types, checked by `npm run
 * typecheck` (see storage.test-d.ts for why these are not in a `.test.ts`).
 */
import {
  GrafanaAlloy,
  GrafanaLoki,
  GrafanaTempo,
  KubePrometheusStack,
  SqsExporter,
} from './observability';

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
