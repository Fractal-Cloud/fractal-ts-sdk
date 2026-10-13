/**
 * offers/observability.ts — Observability domain Offers (Catalogue, Level 3).
 *
 * Concrete implementations declaring which abstract Observability Component each
 * satisfies. Vendor knobs live in each offer's config only. These are all
 * vendor-neutral self-hosted CaaS offers (Prometheus/Jaeger/Elastic on any
 * cluster), so they omit `provider`.
 */
import {unsupported} from './neutral_rules';
import {Messaging_PaaS_AwsSqsQueue} from './generated/messaging';
import {Storage_PaaS_AwsS3, Storage_PaaS_S3} from './generated/storage';
import {
  Observability_CaaS_Elastic,
  Observability_CaaS_GrafanaAlloy,
  Observability_CaaS_GrafanaLoki,
  Observability_CaaS_GrafanaTempo,
  Observability_CaaS_Jaeger,
  Observability_CaaS_KubePrometheusStack,
  Observability_CaaS_Prometheus,
  Observability_CaaS_SqsExporter,
} from './generated/observability';
import type {ContractConfig} from './contract/contract_config';
import {defineOffer, type LiveSystemComponent} from '../core';
import type {GrafanaAlloyConfig} from './grafana_alloy_config';
import type {GrafanaObjectStorageBackendConfig} from './grafana_object_storage_backend_config';
import type {KubePrometheusStackConfig} from './kube_prometheus_stack_config';
import {TRAEFIK_GATEWAY_OFFER_TYPE} from './offer_type_ids';
import {parseRouteLink, routeRefusal} from './route_link_routes';
import type {SqsExporterConfig} from './sqs_exporter_config';
import {onEksCluster, onKubernetesCluster} from './kubernetes_placement';

/** Loki and Tempo reach their S3 bucket through EKS Pod Identity. */
const onS3Eks = onEksCluster(
  'it reaches its S3 bucket with a role granted through EKS Pod Identity',
);

/** Throw the error every check here throws, naming the component. */
const refuse = (id: string, why: string): never => {
  throw new Error(`Live component '${id}': ${why}.`);
};

// ── Observability.Monitoring offers ──────────────────────────────────────────
export const Prometheus = defineOffer<
  'Observability.Monitoring',
  ContractConfig<typeof Observability_CaaS_Prometheus>
>({
  satisfies: 'Observability.Monitoring',
  contract: Observability_CaaS_Prometheus,
  deliveryModel: 'CaaS',
  validate: onKubernetesCluster,
  neutral: {
    retentionDays: unsupported('the agent sets no retention'),
    scrapeInterval: unsupported('the agent sets no scrape interval'),
  },
});

// ── Observability.Tracing offers ─────────────────────────────────────────────
export const Jaeger = defineOffer<
  'Observability.Tracing',
  ContractConfig<typeof Observability_CaaS_Jaeger>
>({
  satisfies: 'Observability.Tracing',
  contract: Observability_CaaS_Jaeger,
  deliveryModel: 'CaaS',
  validate: onKubernetesCluster,
  neutral: {
    retentionDays: unsupported('the agent sets no retention'),
    samplingRate: unsupported(
      'sampling is decided by the instrumented applications',
    ),
  },
});

// ── Observability.Logging offers ─────────────────────────────────────────────
export const ObservabilityElastic = defineOffer<
  'Observability.Logging',
  ContractConfig<
    typeof Observability_CaaS_Elastic,
    never,
    {elasticVersion?: string}
  >
>({
  satisfies: 'Observability.Logging',
  contract: Observability_CaaS_Elastic,
  deliveryModel: 'CaaS',
  validate: onKubernetesCluster,
  neutral: {
    retentionDays: unsupported('the agent sets no retention'),
  },
});

// ── caas-k8s Grafana stack (Helm, on any Kubernetes cluster) ─────────────────
// Offers only: the BFF static catalog owns the services they sit under
// (`Observability.CaaS.Prometheus`, `.Loki`, `.Alloy`, `.Tempo`). No CloudWatch
// anywhere: Grafana has no CloudWatch datasource.

const GRAFANA_LOKI_OFFER_TYPE = Observability_CaaS_GrafanaLoki.offerType;
/** The bucket offers Loki and Tempo keep their data in (the agent also reads the legacy id). */
const S3_BUCKET_TYPES: readonly string[] = [
  Storage_PaaS_AwsS3.offerType,
  Storage_PaaS_S3.offerType,
];
const SQS_QUEUE_TYPE = Messaging_PaaS_AwsSqsQueue.offerType;

/** The one bucket a Grafana storage backend keeps its data in, linked read-write. */
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
): void => {
  ensureOneReadWriteBucket(self, all);
};

/** The routes a Grafana link to a TraefikGateway carries, as the agent reads them. */
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
  contract: Observability_CaaS_KubePrometheusStack,
  deliveryModel: 'CaaS',
  neutral: {
    scrapeInterval: unsupported('the agent sets no scrape interval'),
  },
  validate: (self, all) => {
    onKubernetesCluster(self, all);
    ensureGrafanaRoutes(self, all);
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
  contract: Observability_CaaS_GrafanaLoki,
  deliveryModel: 'CaaS',
  validate: (self, all) => {
    onS3Eks(self, all);
    ensureBackend(self, all);
  },
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
  contract: Observability_CaaS_GrafanaAlloy,
  deliveryModel: 'CaaS',
  validate: (self, all, config) => {
    onKubernetesCluster(self, all);
    if (config.lokiPushUrl !== undefined) {
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
  ContractConfig<typeof Observability_CaaS_GrafanaTempo, 'retentionDays'>
>({
  satisfies: 'Observability.Tracing',
  contract: Observability_CaaS_GrafanaTempo,
  deliveryModel: 'CaaS',
  neutral: {
    samplingRate: unsupported(
      'sampling is decided by the instrumented applications',
    ),
  },
  validate: (self, all) => {
    onS3Eks(self, all);
    ensureBackend(self, all);
  },
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
  contract: Observability_CaaS_SqsExporter,
  deliveryModel: 'CaaS',
  neutral: {
    retentionDays: unsupported('an exporter keeps no data'),
    scrapeInterval: unsupported('the agent sets no scrape interval'),
  },
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
        type: Observability_CaaS_SqsExporter.offerType,
        deliveryModel: 'CaaS',
        parameters: params,
        dependencies: ctx.dependencies,
        links: ctx.links,
      },
    ];
  },
  validate: (self, all, config) => {
    onEksCluster(
      'it reads the queues with a role granted through EKS Pod Identity',
    )(self, all);
    // Lists travel comma-separated: an empty one is sent blank, which the agent
    // reads as unset.
    for (const key of ['queueUrls', 'imagePullSecrets'] as const) {
      if (config[key] !== undefined && config[key].length === 0) {
        refuse(
          self.id,
          `${key} is an empty list: it is sent blank, which the agent reads as unset; omit it`,
        );
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
