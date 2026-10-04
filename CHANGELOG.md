# Changelog

Notable changes to `@fractal_cloud/sdk`. This file starts at 2.4.5, the first
release that changed what gets deployed without saying so. It ships inside the npm
package (`files: ["dist", "CHANGELOG.md"]`) so an installer can read it without
visiting GitHub.

The version published for a release is the GitHub release tag: `release.yml` runs
`npm version <tag>` at publish time, so `package.json` on `main` is not the source
of truth for what is on npm.

## Unreleased

### Added — the caas-k8s platform offers: cert-manager, the SQS exporter, Traefik TLS

All keys are the ones the caas-k8s agent declares in each offer's catalog `Config`;
defaults are the agent's and the SDK sends only what you set.

- **`CertManager`** (`Security.CaaS.CertManager`, vendor-neutral CaaS) on a new
  abstract component **`CertificateManager`** (`Security.CertificateManager`).
  Keys: `hostedZoneId`, `role` (the zone role ARN), `email` (all required),
  `acmeServer` (`production` | `staging` | an `https://` directory URL; default
  `production`), `clusterIssuerName` (default `letsencrypt`), `namespace` (default
  `cert-manager`). The chart (v1.21.2) is pinned by the agent and is not a key.
  A malformed zone id, role ARN, email, ACME server or Kubernetes name is refused
  while building the Live System.
- **`SqsExporter`** (`Observability.CaaS.SqsExporter`) on `Monitoring`. Keys:
  `namespace` (`monitoring`), `queueUrls` (string[], sent comma-separated),
  `monitorIntervalSeconds` (`30`), `image` (unset: the agent's own multi-arch
  release image, private on Docker Hub), `imagePullSecrets` (string[], sent
  comma-separated) and `nodeSelector` (unset: none; an empty selector is refused,
  as the agent would read it as unset). The SDK sends no default. Link it,
  without settings, to
  the `AwsSqsQueue` components it watches (references included); an exporter with
  neither a linked queue nor `queueUrls` is refused.
- **`TraefikGateway`**: Traefik-terminated TLS with `tlsClusterIssuer`,
  `tlsSecretName` (default `traefik-tls` with an issuer), `tlsHosts` (string[],
  default `[host]`) and `plainHttp` (default `true` without TLS, `false` with TLS);
  ForwardAuth exemption by workload with `forwardAuthExemptComponentIds` (string[],
  default `ocelot`; `<liveSystemId>/<componentId>` for another Live System); and the
  existing agent keys the SDK did not expose, `loadBalancerSourceRanges` (string[]
  of CIDRs) and `values`. Refused as the agent refuses them: `tlsHosts` or
  `plainHttp: false` without TLS, `tlsCertificateArn` together with Traefik TLS,
  TLS without `tlsHosts` or `host`, a malformed certificate host, a `host` the
  certificate does not cover, an exempt id starting or ending with `/`, a source
  range that is not a CIDR. A Traefik TLS gateway is accepted as a CloudFront VPC
  origin. With TLS, a route host of a workload link and, over `https`, an
  `AwsCloudFront` alias that the certificate (`tlsHosts`, else `host`; wildcards
  cover one label) does not cover are refused, as the agent refuses the route. A
  route link carrying a nested `routes` array is read from that array only, as the
  agent reads it.
- **`AwsCloudFront`**: a VPC origin over `https` (the agent default) to a
  `TraefikGateway` of the same Live System that does not terminate TLS is refused:
  its load balancer has no listener on 443. Give the gateway TLS or set
  `originProtocol: 'http'`. A referenced gateway is not checked.
- **Grafana stack keys**: `KubePrometheusStack` gains `storageClassName`,
  `prometheusStorageGi` (`50`), `lokiUrl`, `tempoUrl` (`none` = no datasource),
  `alertRules`, `alertmanagerConfig`, `values`; `GrafanaLoki` and `GrafanaTempo`
  gain `storageClassName` and `values`; `GrafanaAlloy` gains `lokiPushUrl` and
  `values`. Retention stays the component's `withRetentionDays` (agent defaults 15 /
  14 / 7).
- **Grafana route**: `KubePrometheusStack` may link to a `TraefikGateway` with the
  workload route settings (`gatewayRouteSettings({routes: [{prefix: '/grafana/'}]})`);
  a sub-path not ending with `/`, or a `rewritePath`, is refused. The link is read
  and refused as the agent reads it: no routes, a route without a prefix, a prefix or
  rewritePath not starting with `/`, a backtick, a host that is not a DNS name, a
  nested entry that is not an object or an unknown `routes.<n>.<field>` key. The same
  reading applies to route links checked against a TLS gateway's certificate. A blank
  `imagePullSecrets` entry on `SqsExporter` is refused rather than dropped.
- **Documented outputs** of caas-k8s #43: `storageClassName` on
  `KubePrometheusStack`, `GrafanaLoki` and `GrafanaTempo` (unset on EKS, the agent
  uses its `fractal-gp3` class when the EBS CSI driver of Auto Mode exists),
  `tlsCertificateExpiresAt` on `TraefikGateway`, `gatewayRoutes` on
  `KubePrometheusStack`.
- The config types are exported: `CertManagerConfig`, `SqsExporterConfig`,
  `TraefikGatewayConfig`, `KubePrometheusStackConfig`,
  `GrafanaObjectStorageBackendConfig`, `GrafanaAlloyConfig`.
- Documented output fields, including `workloadRoleName`, `workloadRoleArn` and
  `workloadRoleDrift` on every component with a Pod Identity role (`K8sWorkload`,
  `CertManager`, `GrafanaLoki`, `GrafanaTempo`, `SqsExporter`). The SDK has no typed
  output helpers; they are read from `liveSystems.state(...)` as before.

### Added — DNS zones: `allowBulkDelete` (cloud agents v8.22.0 and later)

`DnsZoneGuardrails.allowBulkDelete?: boolean` (environment `withDnsZones` entries
and `DnsZoneComponent.withAllowBulkDelete`), default `false`. The agents refuse a
pass that would delete at least 3 record sets and more than half of a zone;
`true` lets one such pass through. It applies once per declaration change (the
agent fingerprints the declaration when it applies a bulk delete, and an unchanged
declaration is guarded again with a request to remove the flag): remove it
afterwards. Omitted, nothing is sent. A non-boolean value is refused before
deploying. **Requires** cloud agents v8.22.0 or later, which are the only ones
that accept the key.

### Changed — refused earlier: Loki, Tempo and Alloy without what the agent needs

`GrafanaLoki` and `GrafanaTempo` now require exactly one link to an `AwsS3` bucket
with `{access: 'read-write'}`, and `GrafanaAlloy` a dependency on a `GrafanaLoki`
component unless `lokiPushUrl` is set. The agent already failed such components
after deploying; a Live System that relied on that is now refused while being
built.

### Changed (agent behavior) — ForwardAuth exempts workloads, not paths

With caas-k8s agents of this contract, a gateway with `forwardAuthAddress` no longer
exempts routes by path. The old default of the removed `forwardAuthExcludedPrefixes`,
`/ocelot/,/grafana/,/prometheus/,/alertmanager/`, served those paths without
authentication; now only the routes of the workloads in
`forwardAuthExemptComponentIds` (default `ocelot`, of the gateway's own Live System)
skip ForwardAuth. Grafana, Prometheus or Alertmanager routed through the gateway are
authenticated from then on, and an `ocelot` workload in another Live System must be
listed by its qualified id `<liveSystemId>/<componentId>`. An empty list is refused
for every `TraefikGateway` list key: it would travel blank, and the agent reads blank
as unset and applies its default (so `[]` would still exempt `ocelot`).

### Changed (BREAKING) — `scrapeInterval` and `samplingRate` are refused

`Monitoring.withScrapeInterval` and `Tracing.withSamplingRate` are deprecated. No
agent reads `scrapeInterval` or `samplingRate` and no offer declares them, so the
platform pruned them before any agent saw them. Every Monitoring offer
(`Prometheus`, `KubePrometheusStack`, `SqsExporter`) and Tracing offer (`Jaeger`,
`GrafanaTempo`) now refuses a Live System whose component carries either key,
whether set as a guardrail or through an operation. Remove the call.

### Changed — URL checks read URLs as the agent does

A URL with a malformed percent-escape (`%` not followed by two hex digits) is
refused for `acmeServer`, `forwardAuthAddress`, `lokiPushUrl`, `lokiUrl`, `tempoUrl`
and `queueUrls`. A queue URL may now carry a `#fragment`, which the agent accepts.

### Removed (BREAKING) — `TraefikGateway({forwardAuthExcludedPrefixes})`

The caas-k8s agent removed the key and its output. Its type is now `never`, and a
value that still reaches the gateway (plain JavaScript, a cast) is refused while
building the Live System. Exempt workloads with `forwardAuthExemptComponentIds`.

### Added — **Amazon RDS for MySQL: `AwsRdsMySqlDbms`, `AwsRdsMySqlDatabase`**

`Storage.PaaS.AwsRdsMySql` and `Storage.PaaS.AwsRdsMySqlDatabase`, the MySQL twins of
the PostgreSQL offers. They take exactly the same keys (`AwsRdsDbmsConfig`), have the
same two modes, and the database link is the same RelationalDatabase link (`access`), so
a linked workload gets the same `DB_*` environment. The agent's defaults follow the
engine: version 8.4, port 3306. The SDK sends no default. `administratorLogin` is
refused above 16 characters on MySQL and 63 on PostgreSQL (each engine's limit, which
the agent already enforced). `AwsRdsMySqlDatabase` takes
`databaseName` only: MySQL has no schema below a database.

### Added — **`cloudwatchLogExports` on both RDS DBMS offers (opt-in)**

`AwsRdsPostgresDbms` and `AwsRdsMySqlDbms` take an optional `cloudwatchLogExports:
string[]`. Unset, nothing is sent and the database's exports are left as they are
(none on a new one). `[]` is sent, and turns exports off. The SDK refuses a value that
is not a list of non-blank strings, or that names a type twice (compared trimmed, in
lower case, as the agent does); the agent refuses a type the engine and mode do not
offer.

### Added — **`AwsCloudFront`: a static site from an S3 bucket**

LINK the distribution to an `AwsS3` bucket with the object-storage link
`{access: 'read'} satisfies ObjectStorageLink` (at most one; the bucket may be a
reference). The agent serves the bucket through an origin access control and grants
this distribution alone in the bucket policy. Three optional keys, sent only when set,
apply to a bucket origin only:
- `defaultRootObject`: the object for `/` and for every `<path>/`; the agent applies
  `index.html` when unset.
- `spaFallback`: answer missing keys with the root object and 200.
- `errorDocument`: the object served with 404 for a missing key (e.g. `404.html`).
  It excludes `spaFallback`.

Directory indexes (`<path>/` → `<path>/<defaultRootObject>`) and compression need no
key: a bucket origin always has them.

Validation, mirroring the agent:
- `aliases` with a bucket link and no `originDomain` is accepted.
- A bucket link combined with `originDomain`, a linked gateway or `redirectTo` is
  refused, as are two bucket links.
- The link takes `access` only. `read` and `read-write` are accepted (the distribution
  is granted read only). `write`, a missing `access`, and any other key such as
  `accessMode` are refused.
- A bucket and a distribution that both declare `region`, differently, are refused
  (the agent also refuses a mismatch with the environment's default region).
- `defaultRootObject` and `errorDocument` must be object keys: letters, digits and
  `._/-`, no leading `/` or `.`, no `..`, at most 255 characters.
- The site keys are refused without a bucket origin: on a redirect, on a distribution
  without aliases or a linked origin, or on a gateway or `originDomain` origin.
  `spaFallback: false` sets nothing and is accepted anywhere.

**Requires** cloud agents v8.22.0 or later. An older agent does not know the MySQL
offers, `cloudwatchLogExports` on PostgreSQL, the bucket origin or the site keys. Its
control plane prunes undeclared keys, so on such an agent the bucket link alone would
not serve the site. Release this SDK (a minor) only after those agents are deployed.

## 2.9.7

### Fixed — **2.9.6 regression: DNS zones failed on the cloud agents in service**

2.9.7 removes the `'strict'` value 2.9.6 introduced, from the type and from the
wire. 2.9.6 sent `recordManagement: 'strict'`; the deployed cloud agents (up to
8.21) accept only `'authoritative'` and mark a zone carrying any other value Fatal,
so DNS zones deployed with 2.9.6 failed (their record sets were not changed).

`DnsRecordManagement` is now `'authoritative' | 'lax'`:

- `'authoritative'` (the default, also when omitted): every record set the zone does
  not declare is deleted, apex NS and SOA aside.
- `'lax'`: record sets Fractal Cloud did not define are left alone (an ACME DNS-01
  `_acme-challenge` TXT survives); a record set removed from the declaration is
  deleted only if it is in the last-applied set (`managedRecords`). Requires cloud
  agents newer than 8.21; older ones fail a `lax` zone without changing it.

The value is sent exactly as chosen on every path (`withDnsZones` on management and
operational environments, `DnsZoneComponent.withRecordManagement`, an Interface
operation or a raw guardrail reaching `AwsRoute53HostedZone`). When it is omitted,
nothing is sent, as before 2.9.6. A wire-format test pins these values.

**Code that used `'strict'` must switch to `'authoritative'`**: `'strict'` is now a
type error, and is refused at runtime (as are `'additive'` and any other value) with
a message naming `'authoritative'` and `'lax'`.

A zone stored as `'strict'` by 2.9.6 keeps failing until it is redeclared with
2.9.7; `environments.plan` shows that redeclaration as a `parameters.dnsZones`
update.

**Before upgrading the cloud agents, check zones that omit `recordManagement`.**
Agents up to 8.21 hold an unset zone that holds record sets nobody declared and
Fractal Cloud did not write (an adopted zone, records made by hand, ACME
`_acme-challenge` TXT records from cert-manager or certbot): nothing in it changes.
The next agents release reads an unset `recordManagement` as `'authoritative'` and
deletes those record sets on the zone's next pass. The safe sequence:

1. With 2.9.7, declare `recordManagement: 'lax'` (or list those records in
   `records`) on every such zone, and deploy it.
2. Then upgrade the cloud agents.

Between steps 1 and 2, agents up to 8.21 fail those `lax` zones without changing
them, until they are upgraded. This replaces the upgrade sequence given for 2.9.6.

Also in this release:

- `DnsZoneOutputs.managedRecords` (`"<fqdn with trailing dot> <TYPE>"`) is typed.
- The README describes `lax` precisely: a record set removed from the declaration
  is deleted only if it is in the last-applied set (`managedRecords`) from the
  previous pass.

## 2.9.6

> Superseded by 2.9.7: `'strict'` is removed, and the upgrade advice below is replaced by the 2.9.7 entry.

### Added — **DNS zones: `recordManagement: 'strict' | 'lax'`**

`DnsZoneGuardrails.recordManagement` (environment `withDnsZones` entries and
`DnsZoneComponent.withRecordManagement`) is now `'strict' | 'lax'`, exported as
`DnsRecordManagement`:

- `'strict'` (the default, also when omitted): every record set the zone does not
  declare is deleted, apex NS and SOA aside.
- `'lax'`: record sets Fractal Cloud did not define are left alone, so an ACME
  DNS-01 `_acme-challenge` TXT written by cert-manager or certbot survives. The
  declared record sets are still kept and put back when changed outside Fractal
  Cloud; one removed from the declaration is deleted only if Fractal Cloud applied
  it before.
- Nothing is written into DNS data to track ownership: the agent keeps what it
  applied in control-plane state (the zone's existing `managedRecords` output).
- `'authoritative'` still compiles, `@deprecated`, and is sent as `'strict'`. A
  zone stored as `authoritative` therefore shows as a `parameters.dnsZones` change
  in `environments.plan` once it is redeclared through this version.
- Omitted, nothing is sent and the agent applies `strict`.
- `'additive'` stays a type error and is refused at runtime; that message, and the
  one for any other value, now names `'strict'` and `'lax'`.

**Requires** cloud agents that know `strict` and `lax`: an older agent refuses them
as unknown values and fails the zone without changing it. Code that declares
`'authoritative'` behaves as before. **Omitting the key now means `'strict'`** on those
agents: a zone holding record sets that nobody declared and Fractal Cloud did not write
(an adopted zone, one edited by hand), which the agents held untouched until now, has
them deleted on its next pass. Declare `'lax'` to keep them.

### Removed (BREAKING for TypeScript callers) — `AwsSqsQueue({dlqAlarm})`

The AWS agent creates no CloudWatch alarm or log group for a queue any more; dead-letter
depth is alerted on by the self-hosted Prometheus / Grafana. The option is gone from the
type. A `dlqAlarm: false` that still reaches the queue (plain JavaScript, a cast) is dropped,
as it asks for what the agent does; any other value is refused while building the Live
System instead of being sent and silently ignored.

### Added — `withEnvironmentSecretsBackend('ssm-parameter-store' | 'secrets-manager')`

On both environment tiers: declares the `environmentSecretsBackend` parameter that picks
where the AWS agent stores environment secrets. `ssm-parameter-store` (the agent default)
writes `SecureString` parameters under
`/fractal/environment-secrets/<environmentShortName>/` with a per-environment KMS key
(values up to 4 KB); `secrets-manager` keeps the legacy `secret-<uuid>` secrets. Any other
value, including one set through `withParameter` or under a differently cased key the agent
would not read, is refused before deploying, since the agent would fail the Live System on
it. The setting is per environment (not inherited from the management environment), and
switching does not migrate or delete secrets already in the other store.

On an environment with an AWS agent or account whose backend is SSM (declared or by
default), a `withSecret` value over 4096 UTF-8 bytes is now refused at resolve time, naming
the secret: the agent would refuse it at patrol time. Secrets Manager allowed 64 KB, so a
large secret (a PEM, a kubeconfig) that deployed before needs
`withEnvironmentSecretsBackend('secrets-manager')`.

### Changed — documentation of the AWS offers, to match the agent

- `Eks`: the neutral `withKubernetesVersion` is honored: unset is never upgraded, a
  newer version is applied one minor per round, and a downgrade is refused.
- `Eks({controlPlaneLogTypes})` is opt-in: absent, a new cluster gets no control-plane
  logging and an existing cluster's is left as it is; `[]` turns it off. The SDK never
  sends a default.
- `AwsCloudFront({originProtocol})` defaults to `https` for a VPC origin (the NLB passes
  TCP 443 through to the gateway, which terminates TLS) and for `originDomain`; `http` is
  an explicit opt-in. `originDomainName` cannot sit on an NLB used as a VPC origin.
- `AwsRdsPostgresDbms`: `readerCount` / `multiAz` default from the environment's
  `networkTier`; only declared keys are reconciled on an existing database; with no
  `Subnet` dependency the agent places the database in the spoke's private subnets.
- `AwsRdsPostgresDatabase({databaseName})`: on a referenced (shared) DBMS the default
  name is scoped by the Live System; set it when a fixed name is needed.

## 2.9.5

### Added — cross-Live-System references: `referenceTo(offer, {liveSystemId, componentId})`

A slot can now stand in for a component another Live System owns (a shared cluster,
DBMS or gateway, another service's topic). Select it with `referenceTo` instead of an
offer; `liveSystemIdOf(boundedContext, liveSystemName)` builds the id the control plane
gives a Live System (`<ownerType>/<ownerId>/<boundedContext>/<liveSystemName>`).

- The slot is emitted under its local id with the offer's type, provider and delivery
  model, a `reference` (`ComponentReference`), and no parameters, dependencies or
  links: the control plane mirrors the target's, read-only, and no agent reconciles it.
- Everything that depends on or links to the slot names the local id; the deploy body
  carries `reference` unchanged, and only on referencing components.
- Refused while building the Live System: an offer that does not satisfy the slot (also
  a type error), a malformed id, and a referenced slot with outbound links or
  application-added children (nothing would ever act on them).
- Requires a control plane and agents that accept references (Phase 5); until the control
  plane enables them, a deploy declaring one is refused with `ComponentReferencesNotEnabled`.
  The control plane also refuses a reference to the referencing Live System itself, to
  another organization, or whose type or provider differs from the target's, and an update
  that turns a component this Live System owns into a reference under the same id (remove
  it first, then add the reference).

### Added — AWS messaging: `AwsSnsTopic`, `AwsSqsQueue`, `MessagingEntity.withTopic`, `MessagingEntityLink`

- `AwsSnsTopic({topicName?, kmsMasterKeyId?, maximumMessageSize?})`; `maximumMessageSize`
  up to 1 MiB (1048576) when every subscriber is SQS, Firehose or Lambda.
- `AwsSqsQueue({queueName?, visibilityTimeoutSeconds?, messageRetentionSeconds?,
  maxReceiveCount?, dlqRetentionSeconds?, rawMessageDelivery?, filterEventNames?,
  filterPolicy?, dlqAlarm?})`: a queue with a dead-letter queue, subscribed to the one
  `AwsSnsTopic` it depends on (`withTopic(topic)`, which may be a reference).
  `filterEventNames` travels comma-separated, `filterPolicy` as JSON text. The neutral
  `withMessageRetentionHours` / `withMaxDeliveryAttempts` map onto the queue (and are
  range-checked there); `withDeadLetterEnabled(false)` is refused, as every queue has a
  dead-letter queue.
- `MessagingEntityLink` types the Workload → topic / queue link (`access`).

### Added — `TraefikGateway` and the Workload → gateway route link

- `TraefikGateway` (`APIManagement.CaaS.TraefikGateway`, owned by the caas-k8s agent):
  `namespace`, `replicas`, `chartVersion`, `host`, `internalLoadBalancer`,
  `tlsCertificateArn`, `entryPointIdleTimeoutSeconds`, and a ForwardAuth middleware
  (`forwardAuthAddress`, `forwardAuthRequestHeaders`, `forwardAuthResponseHeaders`,
  `forwardAuthForwardBody`, `forwardAuthMaxBodySize`, `forwardAuthExcludedPrefixes`; lists
  travel comma-separated). `Traefik` keeps the Java agents' shape. A gateway behind a
  CloudFront VPC origin must stay TCP-only: `tlsCertificateArn` there is refused.
- `gatewayRouteSettings({routes: [{prefix, rewritePath?, host?}], responseTimeoutMs?,
  idleConnTimeoutMs?, retryAttempts?, servicePort?})` builds the flat, indexed settings of
  an outbound Workload → gateway link (`bp.link(service, gateway, gatewayRouteSettings(…))`).
  Route declarations from one workload to one gateway merge into ONE link (the control
  plane keeps one link per source and target), their routes numbered on. Timeouts,
  retries and the port belong to the first declaration: a later one that contradicts
  them, adds one the earlier routes did not set, or repeats a prefix for the same host
  is refused.

### Added — shared-platform knobs

- `Eks({nodePools, controlPlaneLogTypes})`: EKS Auto Mode node pools
  (`EksAutoModeNodePool`: architectures, instance families, capacity types, sizes) and
  control-plane log types.
- `AwsCloudFront`: a site mode in front of the platform gateway: `aliases` with a custom
  origin (`originDomain`) or a VPC origin to a linked `TraefikGateway` / `Traefik`;
  `originProtocol`, `originReadTimeoutSeconds`, `originKeepaliveTimeoutSeconds`,
  `wafEnabled`, `wafRateLimitPer5Min`, `originDomainName`.
- `AwsRdsPostgresDbms({storageType})`; `AwsS3({lifecycleExpirationDays})`.
- Observability offers for the caas-k8s agent: `KubePrometheusStack`, `GrafanaLoki`,
  `GrafanaAlloy`, `GrafanaTempo`.

### Added — Workload rollout, drain, scaling, probes and secret env

`withSecretEnv`, `withResources`, `withAutoscaling`, `withPodDisruptionBudget`,
`withRollout`, `withTerminationGracePeriodSeconds`, `withPreStopSleepSeconds`,
`withReadinessProbe` / `withLivenessProbe` / `withStartupProbe`, `withTopologySpread`,
`withNodeSelector`. `secretEnv` takes environment-secret references only; a raw value is
refused without echoing it.

### Changed — Kubernetes workloads receive every Workload setter

On `K8sWorkload` (and a Workload added under a ContainerPlatform), `port`,
`cpuRequest` / `memoryRequest`, `maxReplicas` and `healthCheck` used to be pruned before
the agent saw them, so the agent's defaults applied. They now arrive as
`containerPort`, `resourceRequests`, `autoscaling.maxReplicas` and
`readinessProbe` + `livenessProbe`. A deployed workload that set them changes on its next
deploy: its port, its requests, an autoscaler, and its probes now follow the blueprint.

An environment-secret reference in `env` used to reach the container as the reference's
JSON; it now moves to `secretEnv`, which the agent resolves (a name in both is refused).

Building a Live System with a Kubernetes workload now refuses what the agent could only
reject or apply wrongly, so a blueprint that built before can fail here with the reason:
a probe (including the older `healthCheck`) whose path does not start with `/`, a probe
port outside 1-65535 or a negative timing, `autoscaling` without a `maxReplicas` of at
least 1 or with `minReplicas` above it, a negative grace period or preStop sleep, a
preStop sleep not shorter than the grace period, a rollout pace that is neither a count
nor a percentage up to 100%, `maxSurge` and `maxUnavailable` both zero, and a raw value in
`secretEnv`.

## 2.9.4

### Added — `AwsCloudFront({redirectTo, aliases})`: a whole-site redirect under your own host names

- `redirectTo`: an `https://` URL. Every request the distribution receives, over
  HTTP or HTTPS, is answered with `301 Moved Permanently` to that URL followed by the
  request's own path and query string, by a CloudFront Function at the edge (no
  origin, no bucket).
- `aliases`: the host names the distribution answers for, only together with
  `redirectTo`. The agent requests a DNS-validated ACM certificate for them in
  us-east-1 and attaches them once it is issued.

The agent writes no DNS record for either: a DNS zone belongs to whoever declares it.
It publishes, as output fields of the component (`cloud.liveSystems.outputs`), the
distribution's `dnsName` and `hostedZoneId` (for an alias record) and the certificate's
`certificateValidationRecords`; the component stays `Instantiating` until the owner of
each name's zone declares those records and the certificate is issued.

`certificateValidationRecords` is a JSON array of `{name, type, value}`, as text:
parse it with `JSON.parse`.

Both are checked when the Live System is built, by the agent's own rules: a target
that is not `https://` + a DNS host name + an optional URL path (no query, fragment,
port, credentials, or character a URL path may not hold), an alias that is not a host
name, an alias equal to the target's host (a redirect loop), or aliases without
`redirectTo` are refused with the reason. A blank `redirectTo` is no redirect.
Requires cloud agents with the CloudFront redirect (the release after 8.20.2).

### Changed — a structured output field arrives as its JSON

`cloud.liveSystems.outputs` coerced every output field with `String(value)`: an
object, or an array of objects, arrived as `[object Object]`, and an array of plain
values comma-joined (`a,b`). Both now arrive as their JSON (`[{"name":"a"}]`,
`["a","b"]`), which `JSON.parse` reads back; a caller that split such an array on
commas parses it instead. Strings, numbers and booleans read as before. Output fields
are strings by contract, and the cloud agents publish structured values as JSON text
already, which passes through unchanged.

## 2.9.3

### Changed — **DNS zones are owned as a whole: `recordManagement: 'additive'` is gone**

Fractal Cloud no longer keeps per-record ownership of a DNS zone: nothing is written
into a zone's DNS data to say which record sets it manages (cloud agents 8.20 wrote a
`_fractal-…` TXT record per record set; the next agent release deletes them). A zone
belongs to the environment or Live System that declares it and holds its declared
`records`.

- `DnsZoneGuardrails.recordManagement` (environment `withDnsZones` entries and
  `DnsZoneComponent.withRecordManagement`) now accepts only `'authoritative'`:
  every record set the zone does not declare is deleted, apex NS and SOA aside.
- Omitted, the zone is reconciled the same way as long as it holds nothing Fractal
  Cloud did not write, which is always true of a zone Fractal Cloud created. A zone
  holding a record set nobody declared and Fractal Cloud did not write (an adopted
  zone, one edited by hand) is held: its agent changes none of its record sets and
  reports the record sets in the way, until they are declared or `'authoritative'`
  is set. Before, omitting it meant `'additive'`.
- `'additive'` is a type error, and is refused at runtime (a JavaScript caller, or a
  cast) with the reason, per-record ownership isn't supported yet; zones are managed
  authoritatively: by `withRecordManagement`, when an environment is resolved
  (`resolveEnvironment`, deploy), and when a Live System selecting
  `AwsRoute53HostedZone` is built.

**Why a minor version although a type lost a value.** The value stopped working on
the platform, not in this package: fractal-environments refuses an environment that
declares it (once the zone's entry is added or edited) and the cloud agents hold the
zone, whatever SDK version sent it. Keeping it in the type would only move that
failure from compile time to a deploy; a major version would suggest that staying on
2.x keeps additive zones working, which it does not. Code that never mentions
`'additive'` compiles and behaves as before.

**To migrate** a zone declaring `recordManagement: 'additive'`: declare every record
set it should keep in `records` and set `'authoritative'`, or remove the key and let
the agent report what is in the way. A stored additive zone left unchanged does not
make an environment update fail; editing its entry does until the value is changed.

## 2.9.2

### Added — **API calls are retried through a brief control-plane outage**

A control-plane rollout answered `503` for minutes and failed every call in that
window, `environments.deploy` included. The client now repeats calls when repeating
is safe, with exponential backoff and jitter (1 s doubling to 15 s), honoring
`Retry-After`; no retry starts more than 2 minutes after the first attempt. Inside a
wait-mode deploy or agent update that is not `quiet`, each retry logs one
`WARN  Control plane unavailable, retrying  method=… path=… cause=… attempt=… retryInMs=… elapsed=…`
line; other calls retry silently unless the client sets `retry: {quiet: false}`.

- **`GET` and `PUT`** are repeated on `502`, `503`, `504` and a dropped or refused
  connection. A `PUT` is a whole-state overlay, so a repeat writes the same state.
- **`POST` and `DELETE`** (initialize, update, create, destroy) are repeated only when
  the failure proves nothing was started: the control plane's drain refusal (`503`,
  `reasonCode: ServiceDraining`, sent by fractal-environments while it shuts down,
  before it does anything), the ingress's own plain-text `503` for a request that
  never reached a pod (the whole body is `no healthy upstream` or `upstream connect
  error ... reset reason: connection failure` / `overflow`), or a refused
  connection. Never on `502`, `504`, a reset connection or a timeout: `POST
  .../initialize` is not idempotent, and a second accepted initialize starts a
  second run.
- `4xx`, `500` and an unknown host are never repeated.

Configure with `createFractalCloudClient({..., retry: {maxElapsedMs, initialDelayMs,
maxDelayMs, quiet}})` (a missing, non-finite or non-positive value takes the default;
no delay is shorter than 25 ms), or turn it off with `retry: false`. Every `send()` call
site now passes a request factory, which a source-level test enforces. No control-plane version
is required; the `ServiceDraining` refusal comes with the fractal-environments release
that drains on shutdown, and against an older one the other rules still apply.

## 2.9.1

**Deploy fractal-environments v3.32.0 or later first.** AWS long-lived keys and AWS
web identity exchanged by the control plane (now the `credentialsFromCi` default)
need it. An older control plane may refuse them (the SDK's error then names the
version) or **ignore them and use AWS credentials it already holds** for the
environment, which no error reveals. Against an older one, use session credentials
or `exchange: 'sdk'`.

### Changed — **AWS long-lived keys are sent as they are**

`{accessKeyId, secretAccessKey}` without a `sessionToken` is no longer refused, and
`credentialsFromCi` no longer exchanges long-lived keys with `sts:GetSessionToken`:
such a session cannot call IAM without MFA, and initializing creates IAM roles. The
two keys are sent as `X-AWS-Access-Key-ID` / `X-AWS-Secret-Access-Key`, and the
control plane holds them for the run only. A set missing a key, or with an empty
`sessionToken`, is still refused. `AwsStaticCiCredentials.sessionDurationSeconds`
is deprecated and ignored.

### Changed — **AWS web identity is exchanged by the control plane by default**

`credentialsFromCi`'s AWS OIDC entries default to `exchange: 'control-plane'`: the
token is sent as `X-AWS-Role-Arn` / `X-AWS-Web-Identity-Token` on initialize and
update, and the control plane calls `sts:AssumeRoleWithWebIdentity` itself (audience
`sts.amazonaws.com`, role in the target account). `exchange: 'sdk'` keeps the
exchange in the job. The `WARN` for web-identity credentials is gone.

## 2.9.0

### Added — **`environments.updateAgents()`: update cloud agents without re-initializing them**

An agent initialized before a permission was added to its role kept running without that
permission. A deploy sends nothing for an agent whose initialization is `Completed`, and
`reinitializeAgents` re-runs the whole initialization. `cloud.environments.updateAgents(tree,
{only, agentUpdate, providerCredentials})` calls the control plane's
`POST .../initializer/{aws|azure|gcp}/update` for each selected agent of the tree, management
environment first. That re-runs the agent's role/permission steps and redeploys it on the latest
published version. `only` selects agents by `{environment, tier, provider, accountId, region}`
(the new `CloudAgentTarget`). `agentUpdate: 'wait'` polls each update through
`.../status` and ignores the run as it was before the update. It logs in the wait-mode format and
throws with the failing step's message. OCI and Hetzner agents, a selection matching nothing, a
partial static AWS set and mixed static/federated static credentials are refused before any
request is sent. `providerCredentials` is optional, per provider too, and is sent as the
`initialize` headers, AWS web identity included. **Until the control plane's update endpoint reads them**, it
updates with the credentials it already holds, so an environment initialized with short-lived
inline credentials (a CI job's assumed role or OIDC token) fails its update at the first step that
needs them, until the endpoint accepts credentials. Writes no environment, and changes nothing about
`deploy`.

`updateAgents` takes the same `reporter` as `deploy` and resolves to `{started, skipped}`: an
agent whose resolver throws `ProviderCredentialsNotConfigured` (as `credentialsFromCi` does for
every cloud but the job's own) is skipped with a notice, so one job per cloud updates its own
cloud's agents.

### Added — **the CI kit: deploy environments from CI without writing the plumbing**

- Ports `CiIdentity` (`idToken(audience)`, optional `fixedAudience`) and
  `CiReporter` (`notice`, `warning`, `error`, `mask`, `appendSummary`), composed
  as a `Ci` with `variable(name)`.
- Adapters: `githubActionsIdentity` / `githubActionsReporter`
  (`ACTIONS_ID_TOKEN_REQUEST_URL` / `_TOKEN`, `::notice::`, `::add-mask::`,
  `GITHUB_STEP_SUMMARY`), `azureDevOpsIdentity` / `azureDevOpsReporter`
  (`POST $(System.OidcRequestUri)?api-version=7.1&serviceConnectionId=` with
  `System.AccessToken`, `##vso[task.logissue]`, `##vso[task.setsecret]`,
  `##vso[task.uploadsummary]`), and the local `consoleReporter` / `noCiIdentity`.
  `detectCi()` picks them from the environment. Messages are escaped so they
  cannot end or forge a CI command.
- `credentialsFromCi(ci, {cloud, aws, gcp, azure, environments?})` returns a
  `providerCredentials` resolver for **one job holding one cloud's
  credentials**. OIDC is the default per cloud (AWS `{roleArn}` exchanged with
  `sts:AssumeRoleWithWebIdentity`, or handed to the control plane with
  `exchange: 'control-plane'`; GCP workload identity federation; Azure
  federated credential), with the audience each cloud expects (or the CI's
  fixed one). CI secrets are the alternative, read with `ciSecret('NAME')`:
  AWS keys (long-lived ones become a session through a signed
  `sts:GetSessionToken` first), an Azure client secret, a GCP key JSON. Tokens
  are minted per request, everything secret is masked through the reporter,
  and an account, project, subscription or environment the configuration does
  not name is refused.
- README: "Deploy from CI", with GitHub Actions and Azure DevOps per-cloud job
  layouts.

### Added — **`environments.plan(trees)`**

A read-only preview of what `deploy` would create (`+`), update (`~`, with the
changed fields), leave unchanged (`=`) or refuse (`!`: an operational
`networkTier` the stored management tier would override). The order of an
environment's agents is not a change. `formatEnvironmentPlan` and
`environmentPlanMarkdown` render it as lines and as a step-summary section.

### Changed — **a deploy skips the agents it cannot initialize, and says so**

**What you may need to change.** A fire-and-forget deploy of a new tree used to
fail before its operational agents; it now succeeds, skipping them with a notice
(a `WARN` deploy-log line, or the `reporter`'s notice; nothing under `quiet`
without a reporter). A caller that relied on that failure reads
`result.skipped`, or passes `pendingManagement: 'fail'`.

- A `providerCredentials` resolver that throws the new
  `ProviderCredentialsNotConfigured` skips that agent with a notice and the
  deploy continues with the other agents, so one job per cloud can each deploy
  the whole tree. An operational agent of a cloud whose management agent was
  skipped this way is skipped the same way, whatever `pendingManagement` says.
  A skip notice is redacted like an error. Any other resolver error still fails the deploy, and so does a
  resolver returning nothing.
- Under `fire-and-forget`, an operational agent whose management agent has not
  completed on that cloud is now **skipped with a notice** instead of throwing
  (the operational environment itself is still written). `pendingManagement:
  'fail'` restores the throw.
- Notices go to the new `reporter` option (a `CiReporter`), or to the deploy log.
- `environments.deploy` resolves to `{started, completed, inProgress, skipped}`
  instead of `void`.
- An environment whose stored agents differ from the declared ones only in order
  is no longer rewritten; the stored order is kept, so it never flips between
  runs.

### Added — **environment DNS zones are hosted by the environment's agents; `DnsZone.agents` optionally narrows them**

`withDnsZones([{name}])` needs no selection: every agent of the environment that hosts DNS zones
hosts its own copy of the zone, with the same records, in the account / project / subscription of
the environment that declares it (an operational environment's zone no longer lives in the
management account). Which agents host DNS zones is what each agent declares to the control plane
(fractal-environments 3.32), so a new kind of agent is used without an SDK change.

To narrow a zone, `agents` lists some of the environment's agents: the declared agent (or cloud
account) itself, or its id — `agentIdOf(agent)`, i.e. `aws`, `gcp`, `azure`, or `{type}:{shortName}`
for an agent bound by name such as `aria:caas-k8s`. Resolving the tree refuses an empty `agents`,
an entry that is not an agent id, an agent object the environment does not declare, and
`dnssec: 'required'` on several selected agents (multi-signer DNSSEC is not supported; `'optional'`
on several hosts is served unsigned). `dnsZoneType` is deprecated. New `withCloudAgent(agent)` /
`withCloudAccount(account)` add a declared agent or account value, so a zone can reference it.

`environments.dnsZones()` results carry the reporting `agent` and are one per agent (two agents of
one type each get theirs); `provider` stays, as the agent's type. `DnsZoneProviderResult.agent` is
a new required field (code that builds results, such as test doubles, must set it), and `problems`
name the agent (`zone (aws): ...`).

Needs fractal-environments 3.32.0 or later: an older control plane ignores `agents`, so a narrowed
zone would be hosted by every agent.

### Added — **`environments.dnsZones()`: read an environment's DNS zone results**

`cloud.environments.dnsZones(id)` reads
`GET /environments/{type}/{ownerId}/{shortName}/dns-zones` and returns
`EnvironmentDnsZones | null`: per zone its `name`, whether it is still `declared`, an
`unassignedReason`, and `results` — one `DnsZoneProviderResult` per provider with
`provider`, `assigned`, `status`, `message`, `zoneId`, `nameServers`, `dsRecords`, the raw
`outputs` and `updatedAt`. These are the NS and DS values needed to delegate the domain at a
registrar. A provider assigned to a zone that has not reported yet appears as `Pending`, so
`results` is the list to watch whether a zone is hosted on one provider or several. `null` means
the environment does not exist. An output field an agent reported malformed is left empty on its
result and named in `problems`, so one bad report does not hide the other zones.

### Added — **`DnsZoneComponent` and the `AwsRoute53HostedZone` offer**

`DnsZoneComponent` (`NetworkAndCompute.DnsZone`) carries the shared DNS zone guardrails every DNS
zone offer enforces: `withDomainName`, `withRecords`, `withVisibility`, `withDnssec`,
`withRecordManagement`, `withAllowedRecordTypes`, `withTtlBounds`, `withCaaIssuers` and
`withSubdomainDelegation`. The agent refuses a declared record outside them rather than adjusting
it. `AwsRoute53HostedZone` emits `NetworkAndCompute.PaaS.AwsRoute53HostedZone` with
`adoptExisting` / `comment` as its vendor plumbing. The types `DnsZoneGuardrails`, `DnsRecord` and
`DnsZoneOutputs` describe the parameters and the published outputs (`zoneId`, `nameServers`,
`dsRecords`).

DNS zones are normally declared on the environment (`withDnsZones`); using the component directly
in a Live System is advanced and unsupported. The environment's `DnsZone` entry now accepts the same
guardrails and `records` (its domain stays under `name`), so both paths share one shape.

### Added — **per-environment provider credentials**

`environments.deploy(mgmt, {providerCredentials})` used one credential set for the
management environment and every operational environment, so a tree spanning
several cloud accounts could not be initialized in one deploy. `providerCredentials`
now also accepts a function:

```ts
providerCredentials: ({environment, tier, provider, accountId, region}) =>
  byShortName[environment.shortName], // or Promise<ProviderCredentials>
```

It is called once per cloud agent, right before that agent's `initialize` request
and only when one is sent, so an already-initialized environment never has its
credentials requested, and short-lived credentials can be minted just in time.
Returning nothing for the agent's provider fails with an error naming the
environment. The credentials it returns join the deployment's redaction set before
the request that carries them. The single-object form is unchanged.

### Added — **`withNetworkTier` and `withParameter` on both environment tiers**

`.withNetworkTier('prod' | 'nonprod')` declares the `networkTier` parameter the AWS
initializer reads; `.withParameter(key, value)` declares any other key, and
`withParameter(key, null)` declares it absent. `agents`, `tags` and `dnsZones` stay
owned by their typed builders (`withParameter` accepts them only as `null`).

The control plane resolves an operational environment's tier from its management
environment first, so a management tier silently overrides every operational one.
A tree declaring two different tiers is therefore refused at resolve time, and a
`networkTier` other than `prod`/`nonprod` is refused too — the server would fail
the initialization on it minutes later. At deploy time the same refusal covers a
tier the management environment only STORES (set in the web UI, say): the
operational environment is not written, and the error names
`withParameter('networkTier', null)` on the management environment as the fix.
Parameter keys are matched case-insensitively throughout, as the server matches
them.

### Added — **`environments.list({type, ownerId})` and `environments.get(id)`**

`list` calls `GET /environments/{type}/{ownerId}` and returns
`{id, name, status, resourceGroups, initializedClouds}` per environment
(`initializedClouds` spelled as the server spells providers: `Aws`, `Azure`, ...).
`get` returns one environment with all of its stored parameters, or `null`.

### Changed — **updating an environment merges its parameters instead of replacing them**

The API's `PUT` replaces `parameters` wholesale, and the SDK sent only the keys it
declared — so any re-deploy that updated an environment wiped every other key: a
`networkTier` set in the web UI, entries the server records itself. A deploy now
starts from the server's current parameters and overlays only the declared keys
(a declared key also replaces a differently-cased spelling of it, since the server
matches keys case-insensitively). The default-CI/CD-profile `PUT` carries the same
merged set.

Drift detection follows the same rule: an environment is updated only when
applying the declared keys would change what is stored.

One consequence to know: a key you stop declaring is no longer removed by the next
update that happens to run. Removing a `withTags` call leaves the stored tags in
place (an `INFO` line names the kept keys); `withParameter('tags', null)` clears
them. `mergeEnvironmentParameters` is
exported so a caller can predict exactly what a deploy writes.

### Changed — **an operational initialization that cannot succeed is refused before it is sent**

The control plane rejects an operational environment's agent initialization until
its management environment's initialization for that provider has Completed
(`ManagementEnvironmentNotInitialized`). Under `agentInit: 'fire-and-forget'`, a
deploy that has just started the management initialization now throws before the
first operational one, naming `agentInit: 'wait'`, instead of sending a request
the server refuses. Re-running once management is initialized proceeds as before;
with `wait` nothing changes.

### Documented — **GitHub Actions + OIDC as the recommended environments-as-code setup**

`guides/github-actions/` covers the recommended setup:

- a `FractalLandingZoneDeployer` role per AWS account, trusting GitHub OIDC on the
  repository's real subject prefix (read from `gh api .../oidc/customization/sub`,
  because immutable-subject repositories send `repo:<owner>@<id>/<name>@<id>`), with
  2-hour sessions and `AdministratorAccess`;
- a deploy workflow with one `configure-aws-credentials` step per account and
  per-environment `providerCredentials` under `agentInit: 'wait'`;
- a pull-request workflow that holds no AWS credentials;
- security notes.

### Documented — **which AWS credentials the control plane honors**

Only three-part session credentials (`accessKeyId` + `secretAccessKey` +
`sessionToken`) are used as inline credentials by the AWS initializer today.

- A partial static set, such as keys without a `sessionToken`, is now **refused**
  before any request: static credentials when the deploy starts, and a resolver's
  credentials when it returns them. The server would not use a partial set. It
  would silently fall back to a credential it already holds, which means acting as
  a different identity than the one supplied.
- `{roleArn, webIdentityToken}` is still sent (as `X-AWS-Role-Arn` /
  `X-AWS-Web-Identity-Token`) but is ignored by the server. The SDK logs a `WARN`
  line for it.

### Changed — **stricter edges of the environment surface**

- In `mergeEnvironmentParameters`, and so in every deploy, a key whose declared
  value is `undefined` is **not declared**. It neither replaces nor removes the
  stored value. Only `null` removes a key.
- `environments.list` and `environments.get` validate the response shape. A body
  they cannot map fails with `Unexpected response from GET ...: <path> ...`
  instead of returning half-mapped data.
- The check that refuses an operational `networkTier` overridden by the
  management environment's stored tier now runs right after the management
  environment is read and **before any environment is written**. Previously,
  environments earlier in the tree could already have been written when it fired.

### Added — **`AzureContainerAppsEnvironment`, the platform a Container App needs**

`AzureContainerApp` cannot run on its own: the agent resolves an
`AzureContainerAppsEnvironment` dependency by type and reads the provisioned
`environmentId` off that peer's output fields. The catalogue and the agent have both
carried that offer all along; this SDK exported no symbol for it, so the dependency was
unexpressible and every Container App authored here failed mid-deployment with
`Component [x] has no AzureContainerAppsEnvironment dependency`.

It satisfies `NetworkAndCompute.ContainerPlatform` — where the catalogue files it —
and emits `NetworkAndCompute.PaaS.AzureContainerAppsEnvironment`.

`location` is required, and spelled `location` rather than `region`. The agent reads
only `location` for this component, and hands it to ARM unguarded — unlike its sibling
`AzureContainerApp`, which falls back to the resolved component region — so an omitted
one is an empty region and a failed deployment, not a default. `region` is a parameter
every Azure offer declares, but this component never consults it.

There is no `resourceGroup` knob: the agent resolves the group from the
`azureResourceGroup` map parameter, falling back to the LiveSystem's group, and a flat
`resourceGroup` string would have read back to the author while provisioning elsewhere.
`logAnalyticsWorkspaceId` and `logAnalyticsSharedKey` are optional and take effect only
together.

```ts
const platform = bp.add(ContainerPlatform({id: 'app-platform'}));
const api = bp.add(Workload({id: 'api-workload'}).dependsOn(platform));
// ...
select: {
  'app-platform': AzureContainerAppsEnvironment({location: 'westeurope'}),
  'api-workload': AzureContainerApp({resourceGroup: 'rg-cp'}),
}
```

### Changed — **a Container App without an environment is refused at author time**

`AzureContainerApp` now throws from `toLiveSystem` when the component declares no
dependency emitted as `NetworkAndCompute.PaaS.AzureContainerAppsEnvironment`, naming
the fix. Previously such a Live System deployed and the agent failed it minutes later.
A blueprint that was already deploying Container Apps successfully has that dependency
and is unaffected; one that was failing in the agent now fails immediately instead.

### Changed — **`GcpMySqlDbms.network` is optional, because the agent now derives it**

`network` was the one key this offer required. It is now optional, and omitting it
selects the environment's spoke network.

Both halves of the original justification stopped being true in
`fractal-cloud-agents#751`:

- the runtime no longer demands the value. `GcpDatabaseInstance.getFromComponent`
  reads the component parameter first and, when it is blank, falls back to
  `CloudSqlNetworkFallback` — the environment's spoke network, already resolved for
  every GCP component before any parameter of this Offer is read;
- the published parameter contract no longer marks it required.
  `GcpMySqlInstantiatorStrategy` declares
  `ParamSpec.derived(NETWORK_PARAM_KEY, "string", "defaults to the environment's spoke
  network when absent")`.

**Nothing you have written breaks.** A supplied `network` still typechecks and still
WINS over the derivation. Keep supplying it when the component's `projectId`
overrides the environment's: `CloudSqlNetworkFallback.forComponent` refuses to derive
across projects, because the spoke name is environment-scoped while the create path is
composed from the overridden project, and it fails telling you to name a VPC in that
project. Supplying it is the only route for that case.

The offer still declares the key, rather than dropping it the way `GcpPostgreSqlDbms`
does — that offer omits `network` entirely and so leaves a cross-project author no way
to supply one at all.

## 2.7.2

Patch. A bug fix; no API change. One narrow authoring combination does change: a
locked `withImage()` together with an explicit `containerImage` on the same workload
now throws at instantiation instead of letting the unlocked key silently override the
lock. That combination previously built and deployed — `image` was pruned by the
contract and `containerImage` reached the agent — so a blueprint doing both must drop
one of them. Setting `containerImage` alone, which is how the existing workarounds are
written, is unaffected.

### Fixed — **a `KubernetesWorkload` never received the image it was given**

`Workload().withImage(v)` wrote the parameter key `image`. The caas-k8s
`KubernetesWorkload` contract declares only `containerImage`, so the value was pruned
before it reached the agent, and the agent then correctly refused a workload with
neither `containerImage` nor `manifestUri`. The sample and the agent were both right;
the SDK was dropping the field.

`image` is not universally wrong — it is the key OpenShift *requires* and the key the
Azure Container App offer reads — so the translation lives at the offers that emit
`CustomWorkloads.CaaS.KubernetesWorkload`, and `withImage` keeps its name and signature.
No caller changes.

There are two such paths, and the second is where the defect actually lived: a top-level
`Workload` selecting the `K8sWorkload` offer, and a workload added as a **child** of a
container platform, which is never offer-selected. The child's component is emitted by
the container platform offer, which spread `child.parameters` verbatim. That is the path
`app_with_identity` takes. Both now translate, so all three container platform offers
carry it.

Where a workload sets `containerImage` explicitly, that value wins and is neither
clobbered nor duplicated. Because `withImage` is a locked guardrail while `containerImage`
is not, an application-authored override of an architect's locked image is now detected
through the instantiation context's locked set and reported rather than silently winning;
a blank override no longer suppresses the guardrail image.

## 2.7.1

Additive. Nothing existing changes behavior; no caller has to change anything. It added
an optional field to a public type, which is a minor under semver, and it shipped as
2.7.1 — a patch. That is the same mismatch this file calls out for 2.4.5 and 2.5.1.

### Added — **`reinitializeAgents`, because a finished initialization is not a live agent**

`environments.deploy` skipped `POST .../initializer/{provider}/initialize` whenever the
stored initialization run read `Completed`, and there was no way to ask for it anyway.
That treats a run that once finished as proof the agent still exists. It is not.

When a management plane is destroyed out of band, the stored run stays `Completed`
forever: no initialize is ever sent again, the `agentInit: 'wait'` poll re-reads that
same run and logs *"Cloud-agent initialization completed"*, and the environment record
itself is intact so create/update logs *"Environment up-to-date"*. The deploy returns
green over an agent that no longer exists, permanently. This is not hypothetical — the
`basic_environment` sample's plane was deleted by an unrelated cleanup job on
2026-08-24 and the sample then failed identically for 16 days, every component
`Unknown`, while every deploy reported success.

There is no agent-liveness endpoint to consult, so the SDK cannot detect this on its
own and does not try. The decision belongs to the caller:

```ts
await cloud.environments.deploy(management, {
  agentInit: 'wait',
  reinitializeAgents: true, // send initialize even if the stored run says Completed
  providerCredentials: {...},
});
```

Set it when the plane is disposable and you would rather re-initialize than trust a
stored status — a CI harness that rebuilds its own environments. Leave it unset when
deploying into a long-lived environment, which is the default: unset, every request,
log line and short-circuit is exactly as before.

Forcing also clears a second short-circuit that would otherwise swallow it. The status
endpoint keeps serving the OLD run until the server picks the new one up, so
`agentInit: 'wait'` could read the pre-existing `Completed` and return success with
nothing having happened. A forced deploy therefore refuses a verdict from the run it
forced over, and waits for a status that differs from it.

## 2.7.0

Minor, for the reason set out under *Choosing the version* at the end of this entry.

### What you may need to change

**One thing, and only if you deploy `AwsDatabricks`:** its config gained two required
keys, `credentialsId` and `storageConfigurationId`. `AwsDatabricks({pricingTier: 'X'})`
stops compiling until you add them. Nothing else in this entry can fail to compile.

### Fixed — **`AwsDatabricks` could never have deployed from this SDK**

`AwsDatabricks` declared `{region?, pricingTier}`. The AWS cloud agent's config for
that offer (`AwsDatabricksConfig.fromParams`) reads two more keys with
`requireStringFromMap`:

```java
ParamSpec.required(CREDENTIALS_ID_PARAM_KEY, "string"),        // "credentialsId"
ParamSpec.required(STORAGE_CONFIGURATION_ID_PARAM_KEY, "string"), // "storageConfigurationId"
```

`requireStringFromMap` throws `REQUIRED_PARAMETER_MISSING` when a key is absent or
blank, and this SDK had no way to put either on the wire. Every `AwsDatabricks`
component authored with this SDK failed on its first reconcile, always — the offer
was unusable, not merely misconfigurable. The `basic_big_data` sample could not have
passed on AWS.

Both keys are now required config on the offer. They are **not** defaulted and cannot
be: unlike a bucket name, they identify a Databricks *account-level* credential
configuration and storage configuration created in the Databricks account console, so
neither the agent nor this SDK can derive or invent them. They are environment inputs
and the caller supplies them.

The sibling `accountId` needs no config key: the agent declares it
`ParamSpec.conditional` and falls back to the workspace's published `accountId` output
field after the first reconcile.

`AzureDatabricks` and `GcpDatabricks` are unaffected — their agents require no
equivalent account-level artifacts.

### Choosing the version

Two required config properties are added to one offer, so
`AwsDatabricks({pricingTier: …})` stops compiling. That is source-breaking on strict
semver. Weighed against what the offer was before — a call that type-checked and then
failed every deployment it was used in — no working caller exists to break: the change
turns a guaranteed runtime failure into a compile error that names the two values the
platform was always going to demand. A caller who never touches `AwsDatabricks` is
unaffected. The tag decides, as it always does here.

## 2.6.0

Minor, for the reason set out under *Choosing the version* at the end of this entry.

### What you may need to change

**One thing, and only if you deploy `AzureBlob`:** its config key `accountTier` is
gone, replaced by `sku` and `accessTier`. Rename `AzureBlob({accountTier: 'X'})` to
`AzureBlob({sku: 'X'})` — see *Fixed* below for what the old key did (nothing) and
what the new ones do. Nothing else in this entry can fail to compile.

### Fixed — **`AzureBlob`'s only knob reached no agent**

`AzureBlob` declared a **required** config key `accountTier: string`. The Azure cloud
agent's published parameter contract for the storage-account offer
(`AzureStorageAccountParameters.paramSpecs()`) declares `sku` and `accessTier` and
has no `accountTier` at all, and `fromComponent` never reads that key. Every value
callers passed was serialized onto the component, accepted by the platform and read
by nobody.

It stayed invisible because both samples that use the offer pass `'Standard_LRS'` —
which is a SKU *name*, not an account tier, and which is what `sku` defaults to on
every path this offer can reach (the agent defaults `sku` to `Premium_LRS` only for
`kind: BlockBlobStorage`, and this offer exposes no `kind`). The account came out
right for the wrong reason. `'Premium_LRS'`, or a literal `'Premium'`, would have been
dropped without a word and produced a Standard_LRS account.

`accountTier` is removed. `sku` (a `SkuName`, e.g. `Standard_LRS`, `Premium_LRS`) and
`accessTier` (`Hot` / `Cool` / `Cold` / `Premium`) take its place, both optional,
matching the agent's contract — which marks every storage-account parameter optional,
about half of them with a non-null default.

Found while investigating a `basic_environment` sweep failure, where it was ruled out
as the cause: because every storage-account parameter is optional, the dropped key
could not have wedged the component. It is a silent-no-op bug on its own.

**`region` on this offer is a separate, still-open no-op.** The agent's storage-account
offer resolves its location from the legacy `azureRegion` key, not the canonical
`region` the SDK emits, so `AzureBlob({region: 'northeurope'})` still produces a
`westeurope` account. That fix belongs agent-side and is not in this release.

### Choosing the version

One offer is retyped: a required config key is removed and two optional ones are
added, so `AzureBlob({accountTier: …})` stops compiling. Strict semver reads a removed
required property as a major. Weighed against what the key actually was — inert, read
by no agent, with a one-word migration and no runtime behavior to preserve — this
argues for a **minor**. A caller who never touches `AzureBlob` is unaffected, and a
JavaScript caller or an already-submitted blueprint still passing `accountTier` is
unaffected at runtime: the key rides through as an inert parameter and does not become
`sku`, which the test suite pins.

Nothing else here is source-breaking. The tag decides, as it always does here.

## 2.5.1

Shipped in 2.5.1; the `dependsOn` widening described below completed in 2.5.3. **This
entry sat under *Unreleased* through 2.5.1, 2.5.2, 2.5.3 and 2.5.4** — it was not
rolled over when those releases were cut, so the version headings below are
reconstructed from the published packages rather than recorded at release time.

The version reasoning kept at the end of this entry is the reasoning as written before
the release, left as-is — and it argued for a minor. It shipped as **2.5.1, a patch**,
which is the same mismatch this file calls out for 2.4.5 below: a release that changes
what an unchanged caller deploys should not hide in a patch number.

### What you may need to change

**Nothing in your code.** No exported identifier was added, removed, renamed or
retyped. `K8sWorkload`, `MinIO`, `CaaSSparkCluster`, `CaaSSparkJob` and
`CaaSMlflow` are imported, called and typed exactly as before.

**What changed is the string those five offers put on the wire** — the `type` of the
component the SDK sends to the platform:

| Offer (exported symbol) | Emitted before (≤ 2.5.0) | Emits now |
|---|---|---|
| `K8sWorkload`, and the workload child `withStatefulService` adds to a ContainerPlatform | `CustomWorkloads.CaaS.K8sWorkload` | `CustomWorkloads.CaaS.KubernetesWorkload` |
| `MinIO` | `Storage.CaaS.MinIO` | `Storage.CaaS.MinioTenant` |
| `CaaSSparkCluster` | `BigData.CaaS.CaaSSparkCluster` | `BigData.CaaS.SparkCluster` |
| `CaaSSparkJob` | `BigData.CaaS.CaaSSparkJob` | `BigData.CaaS.SparkJob` |
| `CaaSMlflow` | `BigData.CaaS.CaaSMlflow` | `BigData.CaaS.SparkMlExperiment` |

Act only if one of these applies:

- **You read `offerType` at runtime.** `SomeOffer({}).offerType` is a live field on
  the exported `Offer` type and now returns the new string. It cannot break a build;
  it will break a hand-written string comparison.
- **You have a Live System stuck in `Mutating`** with a component of one of these
  kinds. That is this bug. Redeploy with this version and the component becomes
  claimable. Nothing needs deleting first — see below for why.
- **You pinned an old version to work around a stuck deployment.** Unpin.

**If you deploy a Databricks or Spark workspace, wire the workspace edge.**
`ComputeCluster`, `MlExperiment` and `DistributedDataProcessing` gained a
`dependsOn` method (see *Added*). A cluster, a job and an MLflow experiment each
need an explicit dependency on the workspace component they live in — the agent
resolves the workspace from that edge and fails the component with
`REQUIRED_PARAMETER_MISSING` when it is absent. A workspace merely present in the
same Live System, or attached with `bp.link`, does not satisfy it. Until now the
edge could not be authored at all for the cluster and the experiment, so any Live
System with a Databricks cluster failed; add `.dependsOn(workspace)` to each
tenant.

Three shapes this can break. Anything that goes through the factories and does none
of them is unaffected.

- **You construct one of those node values yourself** — a hand-rolled
  `ComputeClusterNode`, `MlExperimentNode` or `DistributedDataProcessingNode`
  literal, or a test double — instead of calling the `ComputeCluster()` /
  `MlExperiment()` / `DistributedDataProcessing()` factory. Such a literal is now
  missing `dependsOn` and fails to compile (`TS2322`).

- **You key an exhaustive mapped type off one of those node types**, e.g.
  `Record<keyof ComputeClusterNode<'c'>, string>`. The new method adds a key the
  object literal does not supply, so it fails to compile — with `TS2741`, not
  `TS2322`, and at the lookup table rather than at a node.

- **You duck-type on `dependsOn` to tell these nodes apart.** This one keeps
  compiling and silently changes its answer. `dependsOn` used to be the only
  structural difference between a `DataProcessingJobNode` and a `ComputeClusterNode`,
  which made `'dependsOn' in node` a working discriminator:

  | Node | `'dependsOn' in node` before | now |
  |---|---|---|
  | `DataProcessingJob` | `true` | `true` |
  | `ComputeCluster` | `false` | **`true`** |
  | `MlExperiment` | `false` | **`true`** |
  | `DistributedDataProcessing` | `false` | **`true`** |
  | `Datalake` | `false` | `false` |

  A branch that used it to identify a job now takes the job path for all four. The
  probe typechecks identically before and after, so neither the compiler nor a type
  test flags it. Discriminate on `node.state.type` instead.

### Fixed — **five offer types were unroutable; those components never deployed**

- **The SDK emitted five offer type strings that no agent in the estate registers, so
  those components were silently skipped and never deployed.** This is a fix for a
  silent non-deployment, not a cosmetic rename.

  **What went wrong.** An agent keys its handler registry on the offer type with a
  plain exact map lookup and skips any component it finds no handler for — in the
  Kubernetes agent, `if !registry.CanHandle(component.Type) { continue }`, with no
  normalization, no alias, and no error. The five strings above matched no handler
  key anywhere, so:

  1. the component was skipped by every agent that saw it;
  2. no cloud resource was ever created for it;
  3. the component never left its initial state, so the **Live System stayed in
     `Mutating` indefinitely** and the deploy eventually timed out at the poll cap;
  4. nothing said why. The HTTP calls all returned 200 and the agent logged its
     "components handled" count at debug level, so the failure presented as a hang,
     not as an error.

  Any Live System containing `MinIO`, `CaaSSparkCluster`, `CaaSSparkJob` or
  `CaaSMlflow` could not deploy that component at all. `K8sWorkload` is the same
  defect and is the wider one, because `withStatefulService` emits a Kubernetes
  workload child on a ContainerPlatform without the caller naming the offer — so a
  Live System could hit this without importing `K8sWorkload` at all.

  **Where the new strings come from.** Each is the offer id the platform catalogue
  publishes *and* the exact key the handling agent registers — the two already agreed
  with each other on all five; the SDK was the only side out of step. Two of the old
  values were not arbitrary typos but the wrong *kind* of identifier:
  `Storage.CaaS.MinIO` is the catalogue's **service type** (the slot), while
  `Storage.CaaS.MinioTenant` is the **offer** that fills it — only the offer id is
  ever a component type.

  **Upgrading is safe, and no cleanup is required.** Because these components were
  never claimed by an agent, no provider resource was ever created for them. There is
  no live resource to replace, recreate or orphan when the type string changes — the
  situation is the opposite of 2.4.5's Service Bus SKU change below. A component that
  previously did nothing starts working; nothing that previously worked changes.

### Fixed — **a Databricks cluster or MLflow experiment could not be authored at all**

- **Three abstract BigData components could not express the dependency the agent
  requires, so the components they model always failed.** A Databricks cluster, job
  and MLflow experiment are tenants of a workspace, and the agent resolves that
  workspace from the tenant's own dependency list —
  `getDependenciesByTypes(component, DATABRICKS_TYPE, <Provider>DatabricksOfferType)`
  — throwing `REQUIRED_PARAMETER_MISSING` on an empty result. Only
  `DataProcessingJob` exposed `dependsOn`; `ComputeCluster` and `MlExperiment` did
  not, and no other route reaches `dependencies[]`: `bp` offers `add` and `link`
  only, `link` writes `links[]` which this check never reads, `SlotOps` offers
  `set`/`append`/`addChild`, and the workspace offers emit no children so `addChild`
  throws. A cluster and an experiment were therefore unauthorable through this SDK
  on every provider, and the failure surfaced only at deploy time as
  `"DatabricksCluster requires a Databricks workspace dependency"`.

  `DistributedDataProcessing` — the workspace itself — gained `dependsOn` for the
  same reason one level up: on Azure the workspace reads an optional subnet
  dependency to decide VNet injection, which was likewise unauthorable.

### Changed

- The five offers now emit the ids above. Vendor-neutral CaaS offers continue to emit
  no `provider` — correct, and now asserted by tests.

- `AzureBlob`'s config is now `{region?, sku?, accessTier?}` — see *Fixed* above.

### Added

- Tests pinning `AzureBlob`'s emitted parameters as literals — that `sku` and
  `accessTier` land in `parameters`, and that a caller who reaches past the types and
  passes `accountTier` anyway gets a component that does not carry `sku`. The type
  system stops a TypeScript caller; that test is what would fail if `accountTier` were
  ever quietly re-added as a real key.

- Tests pinning all five emitted strings as literals. There were none before: the
  suite covered each component's PaaS/cloud offers and never instantiated the
  vendor-neutral CaaS ones, which is why every one of the five wrong values passed CI.

- `dependsOn(other)` on `ComputeCluster`, `MlExperiment` and
  `DistributedDataProcessing`, with the same signature and semantics as the existing
  `DataProcessingJob.dependsOn` — append-only, one id per call, order preserved.

- Tests building a Databricks platform end to end and asserting that the cluster, the
  job and the experiment each carry the workspace id in their Live System
  `dependencies`, and that the far end of the edge emits a workspace offer type —
  the two halves the agent's check actually tests.

### Choosing the version

No exported identifier was removed, renamed or retyped. The offer-type fix leaves the
declarations byte-identical; the `dependsOn` additions
widen three exported node types, which is source-breaking for the three shapes listed
under *What you may need to change* — constructing such a node value, keying an
exhaustive mapped type off one, or duck-typing on `dependsOn`, that last one
compiling cleanly while changing behavior. No sample and no known consumer does any
of them.

Between patch and minor, this release argues squarely for a **minor**: it adds
public API surface (three methods) and it changes what an unchanged caller deploys
for five offers — and 2.4.5 below is this file's own precedent that such a release
should not hide in a patch number. The tag decides, as it always does here.

## 2.5.0

### What you may need to change

**The thrown error has a different shape.** Every API operation now throws
`FractalApiError` — exported from the package root — instead of the underlying
superagent error:

| Read this before | Read this now |
|---|---|
| `err.response.body.reasonCode` | `err.reasonCode` |
| `err.response.body` | `err.responseBody` (redacted, length-bounded preview) |
| `err.status` | `err.status` — unchanged |

```ts
import {FractalApiError} from '@fractal_cloud/sdk';
```

**`toLiveSystem()` has two new throws.** It now rejects an offer config that
contradicts an exact locked SKU, and a Basic Service Bus namespace that a topic in
the same Live System depends on. Both are detailed under *Added* below; each
replaces a call that previously either discarded one of two stated intents or
shipped a request the cloud was certain to reject.

### Security — **the client secret no longer reaches a log**

- **Every API operation now throws `FractalApiError` instead of the underlying
  superagent error.** Credentials travel as request headers, and a rejected
  superagent request carries the raw request header block at
  `response.res.req._header`. Node's inspection of that object walks it, so the
  ordinary consumer idiom
  `main().catch(err => { console.error(err); process.exit(1); })` **printed the
  client secret**. Measured through this SDK's public API against a local 403
  listener: 84,937 bytes of output with the secret appearing 18 times; after the
  fix, 856 bytes and zero occurrences.

  The most likely first-run failure — a mistyped credential returning 401/403 — was
  exactly the path that printed the credential, and CI logs are long-lived and
  widely readable.

  The same request objects also held **provider** credentials on the environment
  initializer call (`initHeaders`: Azure service-principal secret, GCP service
  account key, AWS keys), plus environment-secret and CI/CD private-key request
  bodies. All are covered by the same change.

  `FractalApiError` carries `status`, `method`, `url`, `reasonCode` and
  `responseBody` (redacted, length-bounded). The field-by-field mapping from the old
  error is in *What you may need to change* at the top of this entry.

  **Why the error is replaced rather than scrubbed.** Two string-based approaches
  were tried in the sibling samples repository and both failed review: literal-byte
  redaction was defeated by JSON escaping (a full private key printed with zero
  redaction markers, because the compared value held a real newline while the
  printed text held the escape `\n`), and truncation was mistaken for redaction (the
  clip ran before redaction, so a secret straddling the boundary printed 25 of its
  35 characters). Dropping the objects removes the representation entirely, so there
  is nothing left for an encoding to hide in. The residual string redaction that
  does exist — for a response body the server produced — applies both lessons: it
  matches the raw value AND its JSON-escaped spelling, and it always redacts before
  clipping. Both are pinned by regression tests.

  A source-level test additionally fails the build if any `superagent` reference in
  `src/` is not routed through the boundary, because one unwrapped entrypoint
  restores the whole leak. It matches the identifier, so the callable form
  (`superagent('GET', url)`), an alias and a destructure are all caught.

  **The redaction set is every secret the operation sends, not just the client
  pair.** Provider credentials, `Secret.value` and CI/CD SSH private keys are
  collected once per `environments.deploy` and attached to the config
  (`ApiConfig.extraSecrets`), so they are covered on **every** request that operation
  makes — not only the one that carried them. Scoping per call site was measurably
  insufficient: probing the flow against a listener that echoed an Azure SP secret,
  the leak surfaced on the initialization-STATUS poll, a request that sends no
  credential of its own but is a natural place for a server to report "the credentials
  you provided are invalid: `<value>`". `clientId` is covered too.

  **Escaping is handled to arbitrary depth.** A gateway that wraps an upstream payload
  as a JSON string of JSON escapes a secret twice; a one-level spelling set matched
  neither the raw nor the doubly-escaped form, so such a body leaked the value AND
  emitted no redaction marker — nothing signalled the miss. Spellings now iterate to a
  fixed point, and string leaves that are themselves JSON are parsed and redacted from
  the inside out. Verified to four levels of nesting for a PEM key and a
  service-account JSON key.

  **Every string the error stores or prints is redacted, with no field exempt.**
  `reasonCode` was copied out of the response body verbatim while `message` and
  `responseBody` either side of it were both covered — a leak on the one field
  treated as "just a code", when a server appending context to it lands a value we
  sent onto a field `console.error(err)` prints. `method` and `url` were passing
  through untouched as well. All stored strings now go through one `scrub` step
  (redact, then clip), so a field added later is covered by construction rather than
  by remembering. `status` is a number and `name` is a literal; `stack` inherits the
  scrubbed message.

  Identifiers get a length floor (8) where secrets get none: an unbounded `clientId`
  of two characters turned "Forbidden" into "Forb***X-ClientID REDACTED***den".
  Secrets keep no floor, because for a secret over-redaction costs detail while
  under-redaction prints a credential.

  Not covered, and documented as such in the README: a credential echoed back
  percent-encoded or base64'd. No redactor can enumerate every encoding, which is why
  the request path is protected structurally rather than by matching bytes.

### Fixed

- **An exact SKU spelling in a locked `tier` guardrail now decides the Service Bus
  namespace SKU.** `Broker({id}).withTier(v)` sets the neutral parameter `tier` as a
  *locked* guardrail — "locked; devs cannot override". Since 2.4.5 `AzureServiceBus`
  appended `skuTier: 'Standard'` unconditionally, so a broker an architect had
  deliberately locked to `'Basic'` shipped `tier: 'Basic'` **and**
  `skuTier: 'Standard'` in the same component: whichever key the agent read, one of
  the two stated intents was discarded with no error and no warning.

  Only two things may now claim the SKU: a locked `tier` holding an **exact** ARM
  SKU spelling (`'Basic' | 'Standard' | 'Premium'`), then the offer's own `skuTier`;
  otherwise the `Standard` default applies.

  **Matching is exact on purpose — no case folding, no trimming.** `withTier` takes
  a free-form string on a vendor-agnostic Component, and `'premium'` / `'basic'` are
  ordinary words for a service tier or an environment class. An earlier draft of
  this fix matched case-insensitively, which made `withTier('premium')` provision a
  **Premium** namespace (a base charge roughly two orders of magnitude above
  Standard) and, per the destroy-and-recreate behavior below, delete the live
  namespace on the way. An architect who means the SKU writes the SKU.

  An **unlocked** `tier` claims nothing at all. It is dev-open, so letting it select
  the SKU would attach a recurring charge and a destroy-and-recreate to an ordinary
  `.set('tier', …)` call.

### Added

- **`toLiveSystem()` now throws when an offer config contradicts an exact locked
  SKU.** A caller with `withTier('Basic')` plus `skuTier: 'Premium'` deploys today
  and fails fast after upgrading. Failing loud is the point: previously one of the
  two intents was silently discarded.
- **`toLiveSystem()` now refuses a Basic namespace that a topic in the same Live
  System depends on.** ARM rejects a topic create against a Basic namespace with
  400 SubCode=40000, and `AzureServiceBusTopic` is the only Azure `MessagingEntity`
  in this catalogue, so the combination cannot deploy. The SDK knows this before the
  request is sent and now says so instead of shipping a guaranteed failure. Basic
  remains valid for a namespace with no topics — the "entities created at runtime by
  the application" shape.
- `Offer` gained an optional `validate(self, all)` hook, run by `toLiveSystem` once
  every component exists. `instantiate` sees only its own component, so an offer
  could not previously detect that the Live System as a whole is unbuildable. This
  is what implements the refusal above.

### Changed

- `InstantiationContext` gained **optional** `locked?: readonly string[]` — the
  names of the component's locked guardrails, read as `ctx.locked ?? []`. Optional
  so that adding it is strictly additive for a caller who *constructs* a context,
  e.g. a unit test exercising a custom offer's `instantiate`; a required property on
  an exported type would be a compile break for such producers.

### Documentation

- The destructive-upgrade behavior of `skuTier` and the cost implication of the
  `Standard` default are documented on the type, at the default, in the README
  Installation section (which ships to npm) and in the Messaging catalogue section.

## 2.4.5

Published as a **patch**. It should have been a **minor at minimum**, with a
defensible case for a major:

- it added public API surface — the exported type `AzureServiceBusSkuTier` and the
  `skuTier` field on `AzureServiceBus`'s config — which is a minor by semver; and
- it changed what an unchanged caller deploys: a namespace that previously took the
  agent's default (Basic) now gets Standard. A behavior change that alters deployed
  infrastructure, adds a recurring charge, and can delete a live resource is the
  kind of thing a major exists to signal.

None of it was signalled: no release note, no changelog (this file did not exist),
no deprecation window.

### Added

- `AzureServiceBus` accepts `skuTier?: 'Basic' | 'Standard' | 'Premium'`.

### Changed — **breaking in effect, despite the patch version**

- `AzureServiceBus` now sends `skuTier: 'Standard'` when the caller does not specify
  one, instead of leaving the SKU to the agent (whose default is Basic).

  **Two consequences an upgrading caller must know about:**

  1. **A Basic namespace that is already deployed is DELETED on the next deploy.**
     The Azure agent treats any difference between the requested tier and the live
     namespace's tier as an unrecoverable state: it issues an ARM delete of the
     namespace and defers the create to the next reconcile pass. Every queue, topic,
     subscription and enqueued message in that namespace is destroyed. There is no
     in-place SKU update path. Pin `skuTier: 'Basic'` to avoid this.
  2. **Standard carries a monthly per-namespace base fee that Basic does not.** Any
     caller relying on the Basic default picks that charge up silently.

  Why the change is nonetheless right: a Basic namespace cannot host a topic (ARM
  400 SubCode=40000) and `AzureServiceBusTopic` is the only Azure `MessagingEntity`
  in this catalogue. Basic does support queues, but the platform's own queue
  implementation always sets `autoDeleteOnIdle`, which Basic does not support — so
  no entity the platform creates can live on a Basic namespace. Basic is correct
  only for a namespace whose entities are created at runtime by the application,
  which is exactly the case that must now pass `skuTier: 'Basic'` explicitly.

### Remediation for 2.4.5, which cannot be rewritten

2.4.5 is published and immutable, and unpublishing would break every consumer that
has already pinned it. Two of these three steps are done in-repo; the middle one is
the only channel that reaches someone who has **already** installed 2.4.5, and it
requires npm publish rights.

1. **Done.** This file now ships in the npm tarball, and the README's Installation
   section — the page npm renders — carries the upgrade warning. Both reach anyone
   who installs or inspects the package from here on.
2. **NOT DONE — needs a human with npm publish rights.** Nothing in a repo can warn
   an installer of an already-published version; only npm's deprecation channel can:

   ```
   npm deprecate "@fractal_cloud/sdk@2.4.5" \
     "Changes the Azure Service Bus namespace default SKU to Standard. Deploying an existing Basic namespace with this version DELETES it (the agent has no in-place SKU update path). Pass skuTier:'Basic' to keep it. See CHANGELOG.md."
   ```

   Until this is run, 2.4.5 remains `latest` and undeprecated, and today's consumers
   of it receive no warning through any channel.
3. **Ship the pending fix as 2.5.0.** Tag shape is not enforced anywhere:
   `release.yml` runs `npm version ${{ github.event.release.tag_name }}
   --allow-same-version` on `release: created`, with no version-shape check and no
   test gate, so a human tagging `2.4.6` publishes a patch again. Treat the tag as
   the decision it is.
