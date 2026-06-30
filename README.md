# Fractal Cloud TypeScript SDK

[![NPM Version][npm-image]][npm-url]
[![build status][build-image]][build-url]
[![codecov][codecov-image]][codecov-url]
[![license][license-image]](LICENSE)
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![TypeScript Style Guide][gts-image]][gts-url]

## Overview

The Fractal Cloud TypeScript SDK lets platform engineers and application developers define cloud-agnostic infrastructure blueprints in TypeScript and deploy them to any supported cloud provider.

Infrastructure is modelled as reusable architectural building blocks — **Fractals** — that can be validated, governed, and evolved over time. A **Live System** is produced by selecting, per component, a concrete **Offer** from the catalogue — without ever touching vendor-specific tooling or DSLs.

## Why Fractal

Traditional Infrastructure as Code forces a choice between flexibility and control:

- Tightly coupled to a specific cloud vendor
- String-heavy DSLs with no type safety
- Hard to govern at scale
- Focused on raw resources rather than architecture

Fractal Cloud takes a different approach: define infrastructure as **architecture**, stay cloud-agnostic by design, and let the Fractal Automation Engine handle provisioning and drift reconciliation.

## Core concepts

### Fractal (Blueprint)

A Fractal is a governed, reusable infrastructure pattern. It references **abstract Components only** — never offers or vendors — and declares their structure (dependencies and links) and their **guardrails** (locked parameters). Adding a vendor never requires editing an existing Fractal.

### Live System

A Live System is a running instance of a Fractal. It is built by **per-component offer selection**: each abstract Component is mapped to one concrete provider-specific **Offer** that carries the vendor parameters the Automation Engine needs. There is no global provider — mixed-vendor live systems are normal. There are no state files; the cloud is the source of truth.

### The Catalogue — three levels

```
Level 1 — COMPONENT   {domain}.{name}                  e.g. Storage.ObjectStorage
                      Abstract capability contract. Referenced by blueprints. Never provisioned.

Level 2 — SERVICE     {domain}.{deliveryModel}.{name}   delivery-model contract. Never provisioned.

Level 3 — OFFER       {domain}.{deliveryModel}.{name} + a provider
                      Concrete, vendor-specific. The only level that maps to real infra.
```

A blueprint references a Component (`Storage.ObjectStorage`); a Live System selects any Offer that `satisfies` it (`AwsS3`, `AzureBlob`, `GcsBucket`, `MinIO`, …). Selection is **compile-checked**: an offer that does not satisfy a slot's Component is a type error (and is also rejected at runtime).

`provider` is a **vendor** axis (`AWS | Azure | GCP | OCI | Hetzner | Aruba | RedHat | VMware`). `IaaS | PaaS | CaaS | SaaS | FaaS` is the separate `deliveryModel` axis. Vendor-neutral self-hosted offers (e.g. `Kafka`, `Prometheus`, `MinIO` on any cluster) omit `provider`.

### Guardrails vs operations

| Surface | Who sets it | When | Effect |
|---|---|---|---|
| **Guardrail** — `.withXxx()` on a Component, at design time | The architect, inside `createFractal` | Authoring | Sets a neutral parameter and **locks** it. Devs cannot override; a later write throws. |
| **Operation** — a verb on the Fractal `operations` interface | The consuming dev, via `.specialize()` | Specialization | Application-level intent (`withCollation`, `withDatabases`, `withRoutes`). Writes open params or adds child components. Never a pass-through infra knob. |
| **Vendor config** — an Offer's config object | The dev, at offer selection | Live System | Vendor-only knobs (`bucketRegion`, `amiId`, `resourceGroup`, …). |

## Installation

```bash
npm install @fractal_cloud/sdk
```

[Package page](https://www.npmjs.com/package/@fractal_cloud/sdk) · [Source repository](https://github.com/Fractal-Cloud/fractal-ts-sdk)

Requires Node.js 18+ and TypeScript 5+.

## Quick start

The following defines a cloud-agnostic blueprint (a VPC, a subnet, a security group, two VMs, and a container platform), then specializes it and selects AWS offers to build and deploy a Live System.

### 1. Author the Fractal (`fractal.ts`)

```typescript
import {
  createFractal,
  VirtualNetwork, Subnet, SecurityGroup, VirtualMachine, ContainerPlatform,
} from '@fractal_cloud/sdk';

const boundedContextId = {
  ownerType: 'Personal',
  ownerId: process.env['OWNER_ID']!,
  name: 'my-team',
};

export const fractal = createFractal({
  id: 'standard-network',
  version: {major: 1, minor: 0, patch: 0},
  boundedContextId,
  blueprint: bp => {
    const network = bp.add(
      VirtualNetwork({id: 'main-network'})
        .withCidrBlock('10.0.0.0/16')
        .withRegion('us-east-1'),
    );
    const subnet = bp.add(
      Subnet({id: 'app-subnet'}).withCidrBlock('10.0.1.0/24').dependsOn(network),
    );
    const sg = bp.add(
      SecurityGroup({id: 'app-sg'})
        .withIngressRules([{protocol: 'tcp', fromPort: 443, sourceCidr: '0.0.0.0/0'}])
        .dependsOn(network),
    );
    const web = bp.add(VirtualMachine({id: 'web-server'}).withOsType('linux').dependsOn(subnet));
    const api = bp.add(VirtualMachine({id: 'api-server'}).withOsType('linux').dependsOn(subnet));
    const cluster = bp.add(
      ContainerPlatform({id: 'app-cluster'}).withKubernetesVersion('1.29').dependsOn(subnet),
    );

    // Runtime link: web can reach api on 8080 (blueprint owns all links).
    bp.link(web, api, {fromPort: 8080, protocol: 'tcp'});

    return {network, subnet, sg, web, api, cluster};
  },
});
```

### 2. Select offers and build the Live System (`aws_live_system.ts`)

```typescript
import {
  AwsVpc, AwsSubnet, AwsSecurityGroup, Ec2Instance, Eks,
} from '@fractal_cloud/sdk';
import {fractal} from './fractal';

const environment = {
  ownerType: 'Personal',
  ownerId: process.env['OWNER_ID']!,
  name: 'dev',
};

export const liveSystem = fractal.specialize().toLiveSystem({
  name: 'acme-net-aws',
  environment,
  select: {
    'main-network': AwsVpc({}),
    'app-subnet':   AwsSubnet({}),
    'app-sg':       AwsSecurityGroup({}),
    'web-server':   Ec2Instance({amiId: 'ami-0c55b159cbfafe1f0', instanceType: 't3.micro'}),
    'api-server':   Ec2Instance({amiId: 'ami-0c55b159cbfafe1f0', instanceType: 't3.small'}),
    'app-cluster':  Eks({}),
  },
});
```

Every component id must map to an offer whose `satisfies` matches its Component. Selecting, say, `AwsVpc({})` for `'app-subnet'` is a compile-time error.

### 3. Deploy (`index.ts`)

```typescript
import {deploy} from '@fractal_cloud/sdk';
import {liveSystem} from './aws_live_system';

const credentials = {
  clientId: process.env['SERVICE_ACCOUNT_ID']!,
  clientSecret: process.env['SERVICE_ACCOUNT_SECRET']!,
};

await deploy(liveSystem, credentials, {mode: 'wait'});
```

`deploy` submits the Live System (create or update) to Fractal Cloud; the Automation Engine reconciles cloud resources to match it.

## Deployment modes

`deploy(liveSystem, credentials, options)` supports two modes.

### Fire and forget (default)

Submits the live system and returns immediately. Provisioning happens asynchronously. This is the default when no options are passed.

```typescript
await deploy(liveSystem, credentials);
await deploy(liveSystem, credentials, {mode: 'fire-and-forget'}); // equivalent
```

Best for: **applications, CLIs, scripts** where infrastructure deployment is a background concern.

### Wait for Active

Submits, then polls until the live system reaches `Active`. Throws on terminal failure (`FailedMutation`, `Error`) or timeout.

```typescript
await deploy(liveSystem, credentials, {
  mode: 'wait',
  pollIntervalMs: 10_000, // check every 10 s  (default: 5 s)
  timeoutMs: 900_000,     // give up after 15 min (default: 10 min)
  quiet: false,           // set true to suppress wait-mode log lines
});
// reaches here only when the live system is fully Active
```

Best for: **CI/CD pipelines** that must not advance until infrastructure is provisioned.

### Destroy

```typescript
import {destroy} from '@fractal_cloud/sdk';
await destroy(liveSystem, credentials);
```

---

## Catalogue

The blueprint references the **Component** in the left column; a Live System selects any **Offer** beneath it. Offers with no provider are vendor-neutral self-hosted (run on any cluster).

### NetworkAndCompute

| Component | AWS | Azure | GCP | OCI | Hetzner | VMware | RedHat (OpenShift) |
|---|---|---|---|---|---|---|---|
| `VirtualNetwork` | `AwsVpc` | `AzureVnet` | `GcpVpc` | `OciVcn` | `HetznerNetwork` | `VspherePortGroup` | — |
| `Subnet` | `AwsSubnet` | `AzureSubnet` | `GcpSubnet` | `OciSubnet` | `HetznerSubnet` | `VsphereVlan` | — |
| `SecurityGroup` | `AwsSecurityGroup` | `AzureNsg` | `GcpFirewall` | `OciSecurityList` | `HetznerFirewall` | — | `OpenshiftSecurityGroup` |
| `VirtualMachine` | `Ec2Instance` | `AzureVm` | `GcpVm` | `OciInstance` | `HetznerServer` | `VsphereVm` | `OpenshiftVm` |
| `ContainerPlatform` | `Eks` | `Aks` | `Gke` | — | — | — | — |
| `LoadBalancer` | `AwsLb` | `AzureLb` | `GcpGlb` | — | — | — | `OpenshiftService` |

### CustomWorkloads

| Component | AWS | Azure | GCP | RedHat | Self-hosted |
|---|---|---|---|---|---|
| `Workload` | `EcsService` | `AzureContainerApp` | `CloudRun` | `OpenshiftWorkload` | `K8sWorkload` |
| `Function` | `AwsLambda` | `AzureFunction` | `GcpFunction` | — | — |

### Storage

| Component | AWS | Azure | GCP | Aruba | RedHat | Self-hosted |
|---|---|---|---|---|---|---|
| `ObjectStorage` | `AwsS3` | `AzureBlob` | `GcsBucket` | — | `OpenshiftPersistentVolume` | `MinIO` |
| `RelationalDbms` | — | `AzurePostgresDbms` | `GcpPostgresDbms` | `ArubaMySqlDbms` | — | — |
| `RelationalDatabase` | — | `AzurePostgresDatabase` | `GcpPostgresDatabase` | — | — | — |

> `RelationalDatabase` components added under a DBMS via an operation are emitted by the **DBMS's own offer** in its vendor family — selecting `AzurePostgresDbms` makes its databases `AzurePostgresDatabase`. They are not independently offer-selected.

### Messaging

| Component | Azure | GCP | Self-hosted |
|---|---|---|---|
| `Broker` | `AzureServiceBus` | `GcpPubSub` | `Kafka` |
| `MessagingEntity` | `AzureServiceBusTopic` | `GcpPubSubTopic` | `KafkaTopic` |

### BigData

| Component | AWS | Azure | GCP | Self-hosted |
|---|---|---|---|---|
| `DistributedDataProcessing` | `AwsDatabricks` | `AzureDatabricks` | `GcpDatabricks` | — |
| `ComputeCluster` | `AwsDatabricksCluster` | `AzureDatabricksCluster` | `GcpDatabricksCluster` | `CaaSSparkCluster` |
| `DataProcessingJob` | `AwsDatabricksJob` | `AzureDatabricksJob` | `GcpDatabricksJob` | `CaaSSparkJob` |
| `MlExperiment` | `AwsDatabricksMlflow` | `AzureDatabricksMlflow` | `GcpDatabricksMlflow` | `CaaSMlflow` |
| `Datalake` | `AwsS3Datalake` | `AzureDatalake` | `GcpDatalake` | — |

### APIManagement

| Component | AWS | Azure | GCP | Self-hosted |
|---|---|---|---|---|
| `ApiGateway` | `AwsCloudFront` | `AzureApiManagement` | `GcpApiGateway` | `Ambassador` · `Traefik` |

### Observability (self-hosted, CaaS)

| Component | Offer |
|---|---|
| `Monitoring` | `Prometheus` |
| `Tracing` | `Jaeger` |
| `Logging` | `ObservabilityElastic` |

### Security

| Component | AWS | Self-hosted |
|---|---|---|
| `ServiceMesh` | — | `Ocelot` |
| `IdentityProvider` | `Cognito` | `Keycloak` |

## Extending the catalogue

Both Components and Offers are plain values — you can add your own without forking.

### Add a new Offer (including a new vendor)

`defineOffer` returns an offer constructor. Declare which Component it `satisfies`, its 3-part `offerType`, its `deliveryModel`, an optional `provider` (one of the `Provider` vendors; omit for vendor-neutral self-hosted), and a config type for vendor knobs. **Every existing Fractal can select it automatically** — no blueprint changes.

```typescript
import {defineOffer} from '@fractal_cloud/sdk';

// A self-hosted object store satisfying the built-in Storage.ObjectStorage
// Component. Vendor-neutral, so `provider` is omitted.
const Ceph = defineOffer<'Storage.ObjectStorage', {storageClass?: string}>({
  satisfies: 'Storage.ObjectStorage',
  offerType: 'Storage.CaaS.Ceph',
  deliveryModel: 'CaaS',
});

// Select it for any ObjectStorage slot, just like a built-in offer:
fractal.specialize().toLiveSystem({
  name: 'acme-prod',
  environment,
  select: {uploads: Ceph({storageClass: 'rbd'})},
});
```

By default an offer emits one live component merging the blueprint's neutral params with its vendor config. Pass an `instantiate(ctx, config)` to emit a custom set of live components (e.g. a parent plus one child per `ctx.children` entry).

### Add a new abstract Component

Author a Component factory on the core authoring primitives (`newNode`, `guardrail`, `addDependency`). Each `.withXxx()` setter records a neutral parameter and locks it as a guardrail.

```typescript
import {ComponentNode, NodeState, newNode, guardrail} from '@fractal_cloud/sdk';

type TimeSeriesNode<Id extends string = string> = ComponentNode<Id, 'Analytics.TimeSeries'> & {
  withRetentionDays: (v: number) => TimeSeriesNode<Id>;
};
const node = <Id extends string>(s: NodeState): TimeSeriesNode<Id> => ({
  state: s,
  withRetentionDays: v => node<Id>(guardrail(s, 'retentionDays', v)),
});
export const TimeSeries = <const Id extends string>(cfg: {id: Id}): TimeSeriesNode<Id> =>
  node<Id>(newNode(cfg.id, 'Analytics.TimeSeries'));
```

Then write offers that `satisfies: 'Analytics.TimeSeries'`. Custom domains, components, and vendors must be registered with the Fractal Cloud platform for deployment to succeed.

## Samples

The [sample repository](https://github.com/Fractal-Cloud/fractal-ts-sdk-samples) contains ready-to-run examples consumed via the `@fractal_cloud/sdk/model` subpath. `basic_storage` is the canonical reference.

## Architecture

The package root and the `./model` subpath export the same surface.

```
src/model/
  core.ts          # Engine: createFractal, defineOffer, ComponentNode, typed Selection,
                   #         guardrails/locking, links, child components, fluent .specialize()
  service.ts       # deploy / destroy a LiveSystem (HTTP + poll + wait-mode log contract)
  index.ts         # Public barrel
  components/      # Abstract Component factories (Level 1, vendor-agnostic)
    network_and_compute.ts   # VirtualNetwork, Subnet, SecurityGroup, VirtualMachine,
                             #   ContainerPlatform, LoadBalancer
    custom_workloads.ts      # Workload, Function
    storage.ts               # ObjectStorage, RelationalDbms, RelationalDatabase
    messaging.ts             # Broker, MessagingEntity
    big_data.ts              # DistributedDataProcessing, ComputeCluster, DataProcessingJob,
                             #   MlExperiment, Datalake
    api_management.ts        # ApiGateway
    observability.ts         # Monitoring, Tracing, Logging
    security.ts              # ServiceMesh, IdentityProvider
  offers/          # Concrete Offers (Level 3) declaring what Component they satisfy
    <domain>.ts    # one file per domain, mirroring components/
  *.test.ts        # vitest specs — the executable regression suite
```

See [`docs/fractal-model.md`](docs/fractal-model.md) for the locked model specification.

## Contributing and feedback

Contributions and feedback are welcome.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines. Use GitHub Issues for bugs and feature requests, and GitHub Discussions for design questions.

## License

Licensed under AGPLv3. See the [LICENSE](LICENSE) file for details.

Made with ❤️ by the Fractal Cloud team.

[npm-image]: https://img.shields.io/npm/v/@fractal_cloud/sdk.svg
[npm-url]: https://npmjs.org/package/@fractal_cloud/sdk
[build-image]: https://github.com/Fractal-Cloud/fractal-ts-sdk/actions/workflows/pr.yml/badge.svg
[build-url]: https://github.com/Fractal-Cloud/fractal-ts-sdk/actions/workflows/pr.yml
[license-image]: https://img.shields.io/github/license/Fractal-Cloud/fractal-ts-sdk.svg
[gts-image]: https://img.shields.io/badge/code%20style-google-blueviolet.svg
[gts-url]: https://github.com/google/gts
[codecov-image]: https://codecov.io/gh/Fractal-Cloud/fractal-ts-sdk/branch/main/graph/badge.svg
[codecov-url]: https://codecov.io/gh/Fractal-Cloud/fractal-ts-sdk
[snyk-image]: https://snyk.io/test/github/Fractal-Cloud/fractal-ts-sdk/badge.svg
[snyk-url]: https://snyk.io/test/github/Fractal-Cloud/fractal-ts-sdk
</content>
