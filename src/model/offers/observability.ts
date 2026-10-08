/**
 * offers/observability.ts — Observability domain Offers (Catalogue, Level 3).
 *
 * Concrete implementations declaring which abstract Observability Component each
 * satisfies. Vendor knobs live in each offer's config only. These are all
 * vendor-neutral self-hosted CaaS offers (Prometheus/Jaeger/Elastic on any
 * cluster), so they omit `provider`.
 */
import {defineOffer, type LiveSystemComponent} from '../core';
import {
  ensureNamespace,
  hasMalformedEscape,
  isHttpUrl,
  isKubernetesName,
  isWholeAtLeastOne,
  refuse,
} from './caas_param_checks';
import type {GrafanaAlloyConfig} from './grafana_alloy_config';
import type {GrafanaObjectStorageBackendConfig} from './grafana_object_storage_backend_config';
import type {KubePrometheusStackConfig} from './kube_prometheus_stack_config';
import {TRAEFIK_GATEWAY_OFFER_TYPE} from './offer_type_ids';
import {parseRouteLink, routeRefusal} from './route_link_routes';
import type {SqsExporterConfig} from './sqs_exporter_config';

// ── Observability.Monitoring offers ──────────────────────────────────────────
export const Prometheus = defineOffer<
  'Observability.Monitoring',
  {namespace?: string}
>({
  satisfies: 'Observability.Monitoring',
  offerType: 'Observability.CaaS.Prometheus',
  deliveryModel: 'CaaS',
  validate: self => ensureNoUnhonoredKeys(self),
});

// ── Observability.Tracing offers ─────────────────────────────────────────────
export const Jaeger = defineOffer<
  'Observability.Tracing',
  {namespace?: string}
>({
  satisfies: 'Observability.Tracing',
  offerType: 'Observability.CaaS.Jaeger',
  deliveryModel: 'CaaS',
  validate: self => ensureNoUnhonoredKeys(self),
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
// (`Observability.CaaS.Prometheus`, `.Loki`, `.Alloy`, `.Tempo`). No CloudWatch
// anywhere: Grafana has no CloudWatch datasource.

const GRAFANA_LOKI_OFFER_TYPE = 'Observability.CaaS.GrafanaLoki';
/** The bucket offers Loki and Tempo keep their data in (the agent also reads the legacy id). */
const S3_BUCKET_TYPES = ['Storage.PaaS.AwsS3', 'Storage.PaaS.S3'];
const SQS_QUEUE_TYPE = 'Messaging.PaaS.AwsSqsQueue';
/** A queue URL the exporter can poll and derive the queue ARN from, as the agent reads it. */
const SQS_QUEUE_URL =
  /^[Hh][Tt][Tt][Pp][Ss]:\/\/sqs\.[a-z0-9-]+\.amazonaws\.com\/[0-9]{12}\/[A-Za-z0-9_-]{1,80}(\.fifo)?(#\S*)?$/;

/**
 * Neutral parameters of `Monitoring` and `Tracing` that no agent reads: no
 * observability offer declares them, so the platform would prune them before any
 * agent saw them. They are refused instead of being dropped in silence. A key
 * that is present with the value `undefined` (e.g. `withScrapeInterval(undefined)`
 * past the type) is refused too: the call is the mistake, whatever its value.
 */
const UNHONORED_NEUTRAL_KEYS = ['scrapeInterval', 'samplingRate'] as const;

const ensureNoUnhonoredKeys = (self: LiveSystemComponent): void => {
  const key = UNHONORED_NEUTRAL_KEYS.find(k => k in self.parameters);
  if (key !== undefined) {
    refuse(
      self.id,
      `${key} is not honored by ${self.type}: no agent reads it and the platform would ` +
        'drop it before deploying. Remove it (withScrapeInterval / withSamplingRate are deprecated)',
    );
  }
};

/** The component's neutral `retentionDays` (from `withRetentionDays`), when set, must be at least one day. */
const ensureRetention = (self: LiveSystemComponent): void => {
  const days = self.parameters.retentionDays;
  if (
    days !== undefined &&
    !(typeof days === 'number' && isWholeAtLeastOne(days))
  ) {
    refuse(
      self.id,
      `retentionDays ${String(days)} is not a whole number of at least 1`,
    );
  }
};

const ensureStorageClass = (id: string, storageClassName?: string): void => {
  if (
    storageClassName !== undefined &&
    !isKubernetesName(storageClassName.trim())
  ) {
    refuse(
      id,
      `storageClassName '${storageClassName}' is not a Kubernetes name`,
    );
  }
};

/** Loki and Tempo keep their data in exactly one S3 bucket, linked read-write. */
const ensureOneReadWriteBucket = (
  self: LiveSystemComponent,
  all: readonly LiveSystemComponent[],
): void => {
  const bucketLinks = self.links.filter(l =>
    all.some(c => c.id === l.componentId && S3_BUCKET_TYPES.includes(c.type)),
  );
  if (bucketLinks.length === 0) {
    throw new Error(
      `Live component '${self.id}' keeps its data in S3: link it to a ` +
        `${S3_BUCKET_TYPES[0]} bucket with access read-write.`,
    );
  }
  if (bucketLinks.length > 1) {
    throw new Error(
      `Live component '${self.id}' links to ${bucketLinks.length} buckets; ` +
        'link exactly one, with access read-write.',
    );
  }
  const [link] = bucketLinks;
  if (link.settings.access !== 'read-write') {
    refuse(
      self.id,
      `the link from '${self.id}' to bucket '${link.componentId}' needs access read-write, ` +
        `got '${String(link.settings.access)}'`,
    );
  }
};

const ensureBackend = (
  self: LiveSystemComponent,
  all: readonly LiveSystemComponent[],
  config: GrafanaObjectStorageBackendConfig,
): void => {
  ensureNoUnhonoredKeys(self);
  ensureNamespace(self.id, config.namespace);
  ensureStorageClass(self.id, config.storageClassName);
  ensureRetention(self);
  ensureOneReadWriteBucket(self, all);
};

/** A Grafana datasource URL: `none` (no datasource) or an absolute http(s) URL. */
const ensureDatasource = (id: string, key: string, value?: string): void => {
  if (
    value !== undefined &&
    value.trim().toLowerCase() !== 'none' &&
    !isHttpUrl(value.trim())
  ) {
    refuse(id, `${key} '${value}' is neither none nor an absolute http(s) URL`);
  }
};

/**
 * Grafana's routes on a `TraefikGateway` (a route link, as a workload's), refused
 * as the agent refuses them: the link must carry routes, each well-formed (see
 * `routeRefusal`); and since the agent serves Grafana at `/` and strips the
 * sub-path itself, a sub-path must end with `/` and no route may set
 * `rewritePath`. A referenced gateway is checked too, except for the host it
 * would default a route to, which is not known here.
 */
const ensureGrafanaRoutes = (
  self: LiveSystemComponent,
  all: readonly LiveSystemComponent[],
): void => {
  for (const link of self.links) {
    const gateway = all.find(c => c.id === link.componentId);
    if (gateway === undefined || gateway.type !== TRAEFIK_GATEWAY_OFFER_TYPE) {
      continue;
    }
    const why = (reason: string): never =>
      refuse(self.id, `Grafana route link to ${gateway.id}: ${reason}`);
    let routes: ReturnType<typeof parseRouteLink> = [];
    try {
      routes = parseRouteLink(link.settings);
    } catch (e) {
      why(e instanceof Error ? e.message : String(e));
    }
    if (routes.length === 0) {
      why(`the route link from ${self.id} has no routes: set routes.0.prefix`);
    }
    const hostKnown = gateway.reference === undefined;
    const gatewayHost =
      typeof gateway.parameters.host === 'string'
        ? gateway.parameters.host.trim()
        : '';
    for (const parsed of routes) {
      const route = {...parsed, host: parsed.host || gatewayHost};
      const refusal = routeRefusal(route, hostKnown);
      if (refusal !== undefined) {
        why(`route link from ${self.id}: ${refusal}`);
      }
      // The agent returns its Grafana-specific refusals bare, not as a link error.
      if (route.rewritePath !== '') {
        refuse(
          self.id,
          `Grafana route ${route.host}${route.prefix} sets rewritePath; the agent strips the sub-path itself`,
        );
      }
      if (route.prefix !== '/' && !route.prefix.endsWith('/')) {
        refuse(
          self.id,
          `Grafana route prefix '${route.prefix}' must end with "/" (for example /grafana/)`,
        );
      }
    }
  }
};

/**
 * kube-prometheus-stack: Prometheus, Alertmanager and Grafana (chart 91.9.0,
 * objects `kps-*`), selecting every ServiceMonitor and PrometheusRule in the
 * cluster.
 *
 * Grafana may be routed through a `TraefikGateway` with a route link, as a
 * workload's (`bp.link(stack, gateway, gatewayRouteSettings({routes: [{prefix:
 * '/grafana/'}]}))`): the agent routes to `kps-grafana:80`, strips the sub-path
 * (which must end with `/`) and sets Grafana's `root_url`. The route goes
 * through ForwardAuth unless the gateway's `forwardAuthExemptComponentIds`
 * lists this component.
 *
 * Output fields: `namespace`, `releaseName`, `chartVersion`, `prometheusUrl`,
 * `alertmanagerUrl`, `grafanaUrl`, `grafanaAdminSecretName`, `storageClassName`
 * (the class the volume was created with, kept), `gatewayRoutes`.
 */
export const KubePrometheusStack = defineOffer<
  'Observability.Monitoring',
  KubePrometheusStackConfig
>({
  satisfies: 'Observability.Monitoring',
  offerType: 'Observability.CaaS.KubePrometheusStack',
  deliveryModel: 'CaaS',
  validate: (self, all, config) => {
    ensureNoUnhonoredKeys(self);
    ensureNamespace(self.id, config.namespace);
    ensureStorageClass(self.id, config.storageClassName);
    ensureRetention(self);
    ensureGrafanaRoutes(self, all);
    if (
      config.prometheusStorageGi !== undefined &&
      !isWholeAtLeastOne(config.prometheusStorageGi)
    ) {
      refuse(
        self.id,
        `prometheusStorageGi ${config.prometheusStorageGi} is not a whole number of at least 1`,
      );
    }
    ensureDatasource(self.id, 'lokiUrl', config.lokiUrl);
    ensureDatasource(self.id, 'tempoUrl', config.tempoUrl);
  },
});

/**
 * Grafana Loki, monolithic (grafana-community chart 18.13.7, Loki 3.7.8). Its
 * chunks live in the one S3 bucket it links to (`ObjectStorageLink`,
 * `access: 'read-write'`), through its own Pod Identity role.
 *
 * Output fields: `namespace`, `releaseName`, `chartVersion`, `url`, `pushUrl`,
 * `bucketName`, `retentionDays`, `storageClassName`, `serviceAccountName`,
 * `podIdentityRoleArn`, `podIdentityAssociationId`, `workloadRoleName`,
 * `workloadRoleArn`, `workloadRoleDrift`.
 */
export const GrafanaLoki = defineOffer<
  'Observability.Logging',
  GrafanaObjectStorageBackendConfig
>({
  satisfies: 'Observability.Logging',
  offerType: GRAFANA_LOKI_OFFER_TYPE,
  deliveryModel: 'CaaS',
  validate: ensureBackend,
});

/**
 * Grafana Alloy as a DaemonSet (chart 1.13.0, Alloy v1.20.0), shipping the
 * cluster's pod logs to Loki: to `lokiPushUrl`, or else to the `GrafanaLoki`
 * component it depends on. It satisfies `LogShipper`, not `Logging`: it is a
 * shipper, and stores no logs.
 *
 * Output fields: `namespace`, `releaseName`, `chartVersion`, `lokiPushUrl`.
 */
export const GrafanaAlloy = defineOffer<
  'Observability.LogShipper',
  GrafanaAlloyConfig
>({
  satisfies: 'Observability.LogShipper',
  offerType: 'Observability.CaaS.GrafanaAlloy',
  deliveryModel: 'CaaS',
  validate: (self, all, config) => {
    ensureNamespace(self.id, config.namespace);
    if (config.lokiPushUrl !== undefined) {
      if (!isHttpUrl(config.lokiPushUrl.trim())) {
        refuse(
          self.id,
          `lokiPushUrl '${config.lokiPushUrl}' is not an absolute http(s) URL`,
        );
      }
      return;
    }
    const dependsOnLoki = self.dependencies.some(id =>
      all.some(c => c.id === id && c.type === GRAFANA_LOKI_OFFER_TYPE),
    );
    if (!dependsOnLoki) {
      throw new Error(
        `Live component '${self.id}' ships logs to Loki: make it depend on an ` +
          `${GRAFANA_LOKI_OFFER_TYPE} component, or set lokiPushUrl.`,
      );
    }
  },
});

/**
 * Grafana Tempo, single binary (grafana-community chart 3.1.0), with its traces
 * in the one S3 bucket it links to, like `GrafanaLoki`.
 *
 * Output fields: `namespace`, `releaseName`, `chartVersion`, `url`,
 * `otlpGrpcEndpoint`, `otlpHttpEndpoint`, `bucketName`, `retentionDays`,
 * `storageClassName`, `serviceAccountName`, `podIdentityRoleArn`,
 * `podIdentityAssociationId`, `workloadRoleName`, `workloadRoleArn`,
 * `workloadRoleDrift`.
 */
export const GrafanaTempo = defineOffer<
  'Observability.Tracing',
  GrafanaObjectStorageBackendConfig
>({
  satisfies: 'Observability.Tracing',
  offerType: 'Observability.CaaS.GrafanaTempo',
  deliveryModel: 'CaaS',
  validate: ensureBackend,
});

// ── caas-k8s Prometheus exporters ────────────────────────────────────────────
// Under the service `Observability.CaaS.PrometheusExporter`, which the caas-k8s
// agent declares under the BFF component `Observability.CaaS.Monitoring`.

/**
 * A Prometheus exporter of SQS queue depth (EKS only): a Deployment, a Service
 * (port `metrics`, 8080) and a ServiceMonitor that `KubePrometheusStack` scrapes.
 * It watches every `AwsSqsQueue` it links to (no settings; a reference to
 * another Live System's queue works too), the queue and, once published, its
 * dead-letter queue, plus any `queueUrls`. Its Pod Identity role may only
 * `sqs:GetQueueAttributes` on those exact queues. Metrics:
 * `sqs_approximatenumberofmessages`, `..._delayed`, `..._notvisible`, label
 * `queue`; alert on dead letters with `KubePrometheusStack({alertRules})`.
 *
 * Output fields: `namespace`, `serviceName`, `serviceMonitorName`, `queueCount`,
 * `serviceAccountName`, `podIdentityRoleArn`, `podIdentityAssociationId`,
 * `workloadRoleName`, `workloadRoleArn`, `workloadRoleDrift`.
 */
export const SqsExporter = defineOffer<
  'Observability.Monitoring',
  SqsExporterConfig
>({
  satisfies: 'Observability.Monitoring',
  offerType: 'Observability.CaaS.SqsExporter',
  deliveryModel: 'CaaS',
  instantiate: (ctx, config) => {
    const {queueUrls, imagePullSecrets, ...rest} = config;
    const params: Record<string, unknown> = {...ctx.parameters, ...rest};
    if (queueUrls !== undefined) {
      params.queueUrls = queueUrls.join(',');
    }
    if (imagePullSecrets !== undefined) {
      params.imagePullSecrets = imagePullSecrets.join(',');
    }
    return [
      {
        id: ctx.id,
        displayName: ctx.displayName,
        type: 'Observability.CaaS.SqsExporter',
        deliveryModel: 'CaaS',
        parameters: params,
        dependencies: ctx.dependencies,
        links: ctx.links,
      },
    ];
  },
  validate: (self, all, config) => {
    ensureNoUnhonoredKeys(self);
    ensureNamespace(self.id, config.namespace);
    if (config.queueUrls !== undefined && config.queueUrls.length === 0) {
      refuse(
        self.id,
        'queueUrls is an empty list: it is sent blank, which the agent reads as unset; omit it',
      );
    }
    if (
      config.imagePullSecrets !== undefined &&
      config.imagePullSecrets.length === 0
    ) {
      refuse(
        self.id,
        'imagePullSecrets is an empty list: it is sent blank, which the agent reads as unset; omit it',
      );
    }
    if ((config.imagePullSecrets ?? []).some(n => n.trim() === '')) {
      refuse(
        self.id,
        'imagePullSecrets holds a blank entry, which the agent would drop: remove it',
      );
    }
    const badSecret = (config.imagePullSecrets ?? []).find(
      n => !isKubernetesName(n.trim()),
    );
    if (badSecret !== undefined) {
      refuse(
        self.id,
        `imagePullSecrets entry '${badSecret}' is not a Secret name`,
      );
    }
    if (
      config.nodeSelector !== undefined &&
      Object.keys(config.nodeSelector).length === 0
    ) {
      refuse(
        self.id,
        'nodeSelector is empty: the agent reads an empty selector as unset; omit it',
      );
    }
    const badUrl = (config.queueUrls ?? []).find(
      u => !SQS_QUEUE_URL.test(u.trim()) || hasMalformedEscape(u),
    );
    if (badUrl !== undefined) {
      refuse(
        self.id,
        `queueUrls holds '${badUrl}', which is not https://sqs.<region>.amazonaws.com/<account>/<name>`,
      );
    }
    const interval = config.monitorIntervalSeconds;
    if (interval !== undefined && !isWholeAtLeastOne(interval)) {
      refuse(
        self.id,
        `monitorIntervalSeconds ${interval} is not a whole number of seconds of at least 1`,
      );
    }
    if (config.image !== undefined && config.image.trim() === '') {
      refuse(
        self.id,
        `image '${config.image}' is blank: omit it for the agent's own image`,
      );
    }
    for (const [key, value] of Object.entries(config.nodeSelector ?? {})) {
      if (typeof value !== 'string') {
        refuse(self.id, `nodeSelector '${key}' is not a string`);
      }
    }
    const linkedQueues = self.links.filter(l =>
      all.some(c => c.id === l.componentId && c.type === SQS_QUEUE_TYPE),
    );
    if (linkedQueues.length === 0 && (config.queueUrls ?? []).length === 0) {
      throw new Error(
        `Live component '${self.id}' watches no queue: link it to ${SQS_QUEUE_TYPE} ` +
          'components or set queueUrls.',
      );
    }
  },
});
