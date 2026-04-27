# Fractal Cloud TypeScript SDK

[![NPM Version][npm-image]][npm-url]
[![build status][build-image]][build-url]
[![codecov][codecov-image]][codecov-url]
[![license][license-image]](LICENSE)
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![TypeScript Style Guide][gts-image]][gts-url]

## Overview

The Fractal Cloud TypeScript SDK lets platform engineers and application developers define cloud-agnostic infrastructure blueprints in TypeScript and deploy them to any supported cloud provider.

Infrastructure is modelled as reusable architectural building blocks — **Fractals** — that can be validated, governed, and evolved over time. Live Systems map those blueprints to concrete cloud resources without ever touching vendor-specific tooling or DSLs.

## Why Fractal

Traditional Infrastructure as Code forces a choice between flexibility and control:

- Tightly coupled to a specific cloud vendor
- String-heavy DSLs with no type safety
- Hard to govern at scale
- Focused on raw resources rather than architecture

Fractal Cloud takes a different approach: define infrastructure as **architecture**, stay cloud-agnostic by design, and let the Fractal Automation Engine handle provisioning and drift reconciliation.

## Core concepts

### Fractal (Blueprint)

A Fractal is a governed, reusable infrastructure pattern. It defines what an infrastructure system is allowed to be — components, their relationships, and architectural intent — without referencing any cloud provider. Fractals are registered with the Fractal Cloud API and can be composed into higher-order Fractals.

### Live System

A Live System is a running instance of a Fractal. It maps each abstract blueprint component to a concrete provider-specific **Offer** and supplies the vendor parameters the Fractal Automation Engine needs to provision and reconcile cloud resources. There are no state files — the cloud is the source of truth.

## What this SDK supports

- Definition of Fractal Blueprints using cloud-agnostic component helpers
- Deployment of Blueprints to Fractal Cloud
- Definition of Live Systems with typed, provider-specific helpers
- Deployment of Live Systems to any Fractal Cloud Environment
- Personal and organisation-owned accounts

### Infrastructure domains

| Domain | Blueprint types | Live system offers | Providers |
|--------|----------------|-------------------|-----------|
| **NetworkAndCompute** | VirtualNetwork, Subnet, SecurityGroup, VirtualMachine, ContainerPlatform | 41 offers | AWS, Azure, GCP, OCI, Hetzner, VMware, OpenShift, Aruba |
| **CustomWorkloads** | Workload | Satisfied by PaaS/CaaS offers (ECS, Container Apps, Cloud Run, OpenShift, Kubernetes, etc.) | AWS, Azure, GCP, OCI, OpenShift, CaaS |
| **Storage** | FilesAndBlobs, RelationalDbms, RelationalDatabase, DocumentDbms, DocumentDatabase, ColumnOrientedDbms, ColumnOrientedEntity, KeyValueDbms, KeyValueEntity, GraphDbms, GraphDatabase, Search, SearchEntity, Unmanaged | 27 offers | AWS, Azure, GCP, Aruba, CaaS, SaaS |
| **Messaging** | Broker, Entity (PaaS + CaaS), Unmanaged | 12 offers | Azure, GCP, CaaS |
| **BigData** | DistributedDataProcessing, ComputeCluster, DataProcessingJob, MlExperiment, Datalake, Unmanaged | 21 offers | AWS, Azure, GCP, Aruba, CaaS |
| **APIManagement** | PaaS ApiGateway, CaaS ApiGateway, Unmanaged | 6 offers | AWS, Azure, GCP, CaaS |
| **Observability** | Monitoring, Tracing, Logging, Unmanaged | 4 offers | CaaS |
| **Security** | ServiceMesh, Unmanaged | 2 offers | CaaS |
| **Custom** | Any (via `Custom.blueprint()`) | Any (via `Custom.offer()`) | Any |

> Custom aria agents can register additional domains, services, and offers beyond this built-in set. See [Custom Aria Components](#custom-aria-components) below.

## Installation

```bash
npm install @fractal_cloud/sdk
```

[Package page](https://www.npmjs.com/package/@fractal_cloud/sdk) · [Source repository](https://github.com/Fractal-Cloud/fractal-ts-sdk)

Requires Node.js 18+ and TypeScript 5+.

## Quick start

The following example defines a cloud-agnostic blueprint with a VPC, a subnet, a security group, and two VMs — then deploys it on AWS.

### 1. Define the blueprint (`fractal.ts`)

```typescript
import {
  BoundedContext, Fractal, KebabCaseString, OwnerId, OwnerType, Version,
  VirtualNetwork, Subnet, SecurityGroup, VirtualMachine,
} from '@fractal_cloud/sdk';

const bcId = BoundedContext.Id.getBuilder()
  .withOwnerType(OwnerType.Personal)
  .withOwnerId(OwnerId.getBuilder().withValue(process.env['OWNER_ID']!).build())
  .withName(KebabCaseString.getBuilder().withValue('my-team').build())
  .build();

const apiServer = VirtualMachine.create({
  id: 'api-server',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'API Server',
});

const webServer = VirtualMachine.create({
  id: 'web-server',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'Web Server',
}).withLinks([{target: apiServer, fromPort: 8080}]);

const network = VirtualNetwork.create({
  id: 'main-network',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'Main VPC',
  cidrBlock: '10.0.0.0/16',
})
  .withSubnets([
    Subnet.create({
      id: 'public-subnet',
      version: {major: 1, minor: 0, patch: 0},
      displayName: 'Public Subnet',
      cidrBlock: '10.0.1.0/24',
    }).withVirtualMachines([webServer, apiServer]),
  ])
  .withSecurityGroups([
    SecurityGroup.create({
      id: 'web-sg',
      version: {major: 1, minor: 0, patch: 0},
      displayName: 'Web Security Group',
      description: 'Allow SSH and HTTP',
      ingressRules: [
        {protocol: 'tcp', fromPort: 22, toPort: 22, sourceCidr: '0.0.0.0/0'},
        {protocol: 'tcp', fromPort: 80, toPort: 80, sourceCidr: '0.0.0.0/0'},
      ],
    }),
  ]);

export const fractal = Fractal.getBuilder()
  .withId(
    Fractal.Id.getBuilder()
      .withBoundedContextId(bcId)
      .withName(KebabCaseString.getBuilder().withValue('my-iaas-fractal').build())
      .withVersion(Version.getBuilder().withMajor(1).withMinor(0).withPatch(0).build())
      .build(),
  )
  .withComponents([...network.components])
  .build();
```

### 2. Satisfy with AWS components (`aws_live_system.ts`)

```typescript
import {
  AwsVpc, AwsSubnet, AwsSecurityGroup, Ec2Instance,
  Environment, KebabCaseString, LiveSystem, OwnerId, OwnerType,
} from '@fractal_cloud/sdk';
import {bcId, fractal} from './fractal';

function bp(id: string) {
  const c = fractal.components.find(x => x.id.toString() === id);
  if (!c) throw new Error(`Blueprint component '${id}' not found`);
  return c;
}

export function getLiveSystem(): LiveSystem {
  const vpc    = AwsVpc.satisfy(bp('main-network')).withEnableDnsSupport(true).build();
  const subnet = AwsSubnet.satisfy(bp('public-subnet')).withAvailabilityZone('eu-central-1a').build();
  const sg     = AwsSecurityGroup.satisfy(bp('web-sg')).build();
  const web    = Ec2Instance.satisfy(bp('web-server')).withAmiId('ami-0c55b159cbfafe1f0').withInstanceType('t3.micro').build();
  const api    = Ec2Instance.satisfy(bp('api-server')).withAmiId('ami-0c55b159cbfafe1f0').withInstanceType('t3.small').build();

  return LiveSystem.getBuilder()
    .withId(LiveSystem.Id.getBuilder().withBoundedContextId(bcId)
      .withName(KebabCaseString.getBuilder().withValue('my-iaas-aws').build()).build())
    .withFractalId(fractal.id)
    .withGenericProvider('AWS')
    .withEnvironment(Environment.getBuilder()
      .withId(Environment.Id.getBuilder()
        .withOwnerType(OwnerType.Personal)
        .withOwnerId(OwnerId.getBuilder().withValue(process.env['OWNER_ID']!).build())
        .withName(KebabCaseString.getBuilder().withValue('dev').build()).build()).build())
    .withComponent(vpc).withComponent(subnet).withComponent(sg).withComponent(web).withComponent(api)
    .build();
}
```

### 3. Deploy (`index.ts`)

```typescript
import {ServiceAccountCredentials, ServiceAccountId} from '@fractal_cloud/sdk';
import {fractal} from './fractal';
import {getLiveSystem} from './aws_live_system';

const credentials = ServiceAccountCredentials.getBuilder()
  .withId(ServiceAccountId.getBuilder().withValue(process.env['SERVICE_ACCOUNT_ID']!).build())
  .withSecret(process.env['SERVICE_ACCOUNT_SECRET']!)
  .build();

await fractal.deploy(credentials);
await getLiveSystem().deploy(credentials);
```

The blueprint is registered with Fractal Cloud. The Automation Engine reconciles cloud resources to match the Live System definition.

## Deployment modes

`liveSystem.deploy()` supports two modes via an optional `DeployOptions` argument.

### Fire and forget (default)

Submits the live system to Fractal Cloud and returns immediately. Provisioning happens asynchronously. Errors are logged but not thrown. This is the default when no options are passed.

```typescript
// Equivalent — both are fire-and-forget
await liveSystem.deploy(credentials);
await liveSystem.deploy(credentials, {mode: 'fire-and-forget'});
```

Best for: **applications, CLIs, scripts** where infrastructure deployment is a background concern.

### Wait for Active

Submits the live system, then polls until all components reach `Active` status. Throws if deployment fails (`FailedMutation`, `Error`) or if the timeout is exceeded.

```typescript
await liveSystem.deploy(credentials, {
  mode: 'wait',
  pollIntervalMs: 10_000, // check every 10 s  (default: 5 s)
  timeoutMs: 900_000,     // give up after 15 min (default: 10 min)
});
// reaches here only when the live system is fully Active
```

Best for: **CI/CD pipelines** where the pipeline must not advance until infrastructure is fully provisioned.

---

## Multi-provider support

The same blueprint can be deployed on any supported provider. Live system files are short and only contain vendor-specific parameters — all structural decisions (dependencies, traffic rules, security rules) stay in the blueprint.

### IaaS

| Blueprint component | AWS | Azure | GCP | OCI | Hetzner | VMware | OpenShift | Aruba |
|---------------------|-----|-------|-----|-----|---------|--------|-----------|-------|
| `VirtualNetwork` | `AwsVpc` | `AzureVnet` | `GcpVpc` | `OciVcn` | `HetznerNetwork` | `VspherePortGroup` | — | `ArubaVpc` |
| `Subnet` | `AwsSubnet` | `AzureSubnet` | `GcpSubnet` | `OciSubnet` | `HetznerSubnet` | `VsphereVlan` | — | `ArubaSubnet` |
| `SecurityGroup` | `AwsSecurityGroup` | `AzureNsg` | `GcpFirewall` | `OciSecurityList` | `HetznerFirewall` | — | `OpenshiftSecurityGroup` | `ArubaSecurityGroup` |
| `VirtualMachine` | `Ec2Instance` | `AzureVm` | `GcpVm` | `OciInstance` | `HetznerServer` | `VsphereVm` | `OpenshiftVm` | `ArubaCloudServer` |

### PaaS / CaaS

| Blueprint component | AWS | Azure | GCP | OCI | OpenShift | Aruba | CaaS |
|---------------------|-----|-------|-----|-----|-----------|-------|------|
| `ContainerPlatform` | `AwsEcsCluster` · `AwsEksCluster` | `AzureAksCluster` · `AzureContainerAppsEnvironment` | `GcpGkeCluster` | — | — | `ArubaKaaS` | — |
| `Workload` | `AwsEcsTaskDefinition` + `AwsEcsService` | `AzureContainerInstance` · `AzureContainerApp` | `GcpCloudRunService` | `OciContainerInstance` | `OpenshiftWorkload` | — | `CaaSK8sWorkload` |

### Storage

| Blueprint component | AWS | Azure | GCP | Aruba | CaaS |
|---------------------|-----|-------|-----|-------|------|
| `FilesAndBlobs` | `AwsS3` | `AzureStorageAccount` · `AzureBlobContainer` · `AzureFileStorage` | `GcpCloudStorage` | `ArubaObjectStorageAccount` | — |
| `RelationalDbms` | — | `AzurePostgreSqlDbms` · `AzureCosmosDbAccount` | `GcpPostgreSqlDbms` | `ArubaMySqlDbms` · `ArubaMsSqlDbms` | — |
| `RelationalDatabase` | — | `AzurePostgreSqlDatabase` · `AzureCosmosDbPostgreSqlDatabase` | `GcpPostgreSqlDatabase` | — | — |
| `DocumentDbms` | — | `AzureCosmosDbAccount` | `GcpFirestore` | — | — |
| `ColumnOrientedDbms` | — | `AzureCosmosDbCassandra` | `GcpBigTable` | — | — |
| `Search` | — | — | — | — | `Elastic` |

### BigData

| Blueprint component | AWS | Azure | GCP | Aruba | CaaS |
|---------------------|-----|-------|-----|-------|------|
| `DistributedDataProcessing` | `AwsDatabricks` | `AzureDatabricks` | `GcpDatabricks` | — | `CaaSSparkOperator` |
| `ComputeCluster` | `AwsDatabricksCluster` | `AzureDatabricksCluster` | `GcpDatabricksCluster` | — | `CaaSSparkCluster` |
| `DataProcessingJob` | `AwsDatabricksJob` | `AzureDatabricksJob` | `GcpDatabricksJob` | — | `CaaSSparkJob` |
| `MlExperiment` | `AwsDatabricksMlflow` | `AzureDatabricksMlflow` | `GcpDatabricksMlflow` | — | `CaaSMlflow` |
| `Datalake` | `AwsS3Datalake` | `AzureDatalake` | `GcpDatalake` | `ArubaS3Bucket` | — |

### OpenShift-specific offers

| Offer | Type string | Blueprint equivalent |
|-------|-------------|---------------------|
| `OpenshiftService` | `NetworkAndCompute.CaaS.OpenshiftService` | Kubernetes Service + Route (standalone) |
| `OpenshiftPersistentVolume` | `Storage.CaaS.OpenshiftPersistentVolume` | Persistent Volume Claim (standalone) |

### Aruba-specific offers

These offers have no cross-vendor blueprint equivalent and are used standalone alongside the satisfied components above.

| Offer | Type string | Description |
|-------|-------------|-------------|
| `ArubaSshKeyPair` | `NetworkAndCompute.IaaS.ArubaSshKeyPair` | SSH key pair registered in the Aruba account |
| `ArubaElasticIp` | `NetworkAndCompute.IaaS.ArubaElasticIp` | Reserved public IP for Aruba cloud servers |
| `ArubaVpcPeering` | `NetworkAndCompute.IaaS.ArubaVpcPeering` | VPC-to-VPC peering connection |
| `ArubaVpnTunnel` | `NetworkAndCompute.IaaS.ArubaVpnTunnel` | Site-to-site VPN tunnel |
| `ArubaContainerRegistry` | `NetworkAndCompute.PaaS.ArubaContainerRegistry` | Managed container image registry |
| `ArubaBlockStorage` | `Storage.IaaS.ArubaBlockStorage` | Block storage volume attachable to a cloud server |

## Custom Aria Components

Enterprise customers running custom aria agents can extend the SDK with their own infrastructure domains, service delivery models, and component types — no fork required.

### Defining custom component types

Use `Custom.blueprint()` and `Custom.offer()` to create reusable factories. Each factory stamps out components of a specific type, just like the built-in helpers (`VirtualNetwork`, `AwsVpc`, etc.).

```typescript
import {
  Custom, Fractal, LiveSystem, ServiceDeliveryModel,
} from '@fractal_cloud/sdk';

// ── 1. Define factories (once per type, reusable) ─────────────────────────

const TimeSeriesStore = Custom.blueprint({
  domain: 'Analytics',                       // any string — not limited to built-in domains
  serviceDeliveryModel: ServiceDeliveryModel.PaaS,
  name: 'TimeSeriesStore',                   // must be PascalCase
});

const InfluxDb = Custom.offer({
  domain: 'Analytics',
  serviceDeliveryModel: ServiceDeliveryModel.PaaS,
  name: 'InfluxDb',
  provider: 'CustomProvider',                // any string — not limited to built-in providers
});
```

### Creating blueprint components (cloud-agnostic)

```typescript
// ── 2. Blueprint — what the architecture needs ────────────────────────────

const metricsDb = TimeSeriesStore.create({
  id: 'metrics-db',
  version: { major: 1, minor: 0, patch: 0 },
  displayName: 'Metrics Database',
  parameters: { retentionDays: '90', replicationFactor: '3' },
});
```

### Satisfying with a custom offer (vendor-specific)

The `satisfy()` method works exactly like built-in offers: it locks the blueprint's id, version, displayName, description, dependencies, links, and parameters, then exposes only vendor-specific parameter setters.

```typescript
// ── 3. Live system — how the architecture is provisioned ──────────────────

const influx = InfluxDb.satisfy(metricsDb)
  .withParameter('bucket', 'metrics')
  .withParameter('orgId', 'my-org')
  .build();
```

### Standalone creation (without a blueprint)

If you don't need the blueprint-satisfy flow, create live system components directly:

```typescript
const influx = InfluxDb.create({
  id: 'metrics-db',
  version: { major: 1, minor: 0, patch: 0 },
  displayName: 'Metrics Database',
  parameters: { bucket: 'metrics', orgId: 'my-org' },
});
```

### Using the fluent builder

For advanced scenarios (dependencies, links, conditional params), use the builder API:

```typescript
const metricsDb = TimeSeriesStore.getBuilder()
  .withId('metrics-db')
  .withVersion(1, 0, 0)
  .withDisplayName('Metrics Database')
  .withParameter('retentionDays', '90')
  .withDependencies([{ id: someOtherComponent.id }])
  .withLinks([{ id: anotherComponent.id, parameters: linkParams }])
  .build();
```

### Deploying custom components

Custom components integrate seamlessly with the standard deploy flow:

```typescript
// ── 4. Deploy as usual ────────────────────────────────────────────────────

const fractal = Fractal.getBuilder()
  .withId(fractalId)
  .withComponents([metricsDb])
  .build();

const liveSystem = LiveSystem.getBuilder()
  .withId(liveSystemId)
  .withFractalId(fractal.id)
  .withGenericProvider('CustomProvider')
  .withEnvironment(environment)
  .withComponent(influx)
  .build();

await fractal.deploy(credentials);
await liveSystem.deploy(credentials, { mode: 'wait' });
```

### Mixing custom and built-in components

Custom components can coexist with built-in ones in the same Fractal:

```typescript
import { VirtualNetwork, Subnet, Custom, ServiceDeliveryModel } from '@fractal_cloud/sdk';

const MyCache = Custom.blueprint({
  domain: 'Performance',
  serviceDeliveryModel: ServiceDeliveryModel.PaaS,
  name: 'DistributedCache',
});

const network = VirtualNetwork.create({ /* ... */ })
  .withSubnets([
    Subnet.create({ /* ... */ }),
  ]);

const cache = MyCache.create({
  id: 'app-cache',
  version: { major: 1, minor: 0, patch: 0 },
  displayName: 'Application Cache',
  parameters: { maxMemoryMb: '4096', evictionPolicy: 'lru' },
  dependencies: [{ id: network.vpc.id }],   // depend on built-in components
});

const fractal = Fractal.getBuilder()
  .withId(fractalId)
  .withComponents([...network.components, cache])
  .build();
```

### API reference

| Function | Returns | Description |
|----------|---------|-------------|
| `Custom.blueprint(config)` | `CustomBlueprintFactory` | Define a reusable blueprint component type |
| `Custom.offer(config)` | `CustomOfferFactory` | Define a reusable live system offer type |

**`CustomBlueprintFactory`**

| Method | Returns | Description |
|--------|---------|-------------|
| `.create(config)` | `BlueprintComponent` | Create a component with id, version, displayName, parameters, dependencies, links |
| `.getBuilder()` | `CustomBlueprintBuilder` | Fluent builder with `withParameter(key, value)`, `withDependencies()`, `withLinks()` |
| `.typeString` | `string` | The full type string (e.g. `"Analytics.PaaS.TimeSeriesStore"`) |

**`CustomOfferFactory`**

| Method | Returns | Description |
|--------|---------|-------------|
| `.create(config)` | `LiveSystemComponent` | Create a live system component directly |
| `.getBuilder()` | `CustomOfferBuilder` | Fluent builder with full access to all fields |
| `.satisfy(blueprint)` | `CustomSatisfiedBuilder` | Lock structural fields from blueprint; only `withParameter()`/`withParameters()` exposed |
| `.typeString` | `string` | The full type string (e.g. `"Analytics.PaaS.InfluxDb"`) |

**`CustomSatisfiedBuilder`** (returned by `satisfy()`)

| Method | Returns | Description |
|--------|---------|-------------|
| `.withParameter(key, value)` | `CustomSatisfiedBuilder` | Add a single vendor-specific parameter |
| `.withParameters(record)` | `CustomSatisfiedBuilder` | Add multiple vendor-specific parameters at once |
| `.build()` | `LiveSystemComponent` | Build the final component |

### Validation

- **Component name** must be PascalCase (e.g. `TimeSeriesStore`, `InfluxDb`). Validated eagerly when the factory is created — a `SyntaxError` is thrown immediately for invalid names.
- **Component id** must be kebab-case (e.g. `metrics-db`). Each segment must start with a letter.
- **Domain and provider** accept any string. Built-in values (`InfrastructureDomain.Storage`, `'AWS'`, etc.) provide autocomplete but are not enforced.
- Custom domains and providers must be registered with the Fractal Cloud platform for deployment to succeed.

---

## Samples

The [sample repository](https://github.com/Fractal-Cloud/fractal-ts-sdk-samples) contains ready-to-run examples:

| Sample | Providers | Description |
|--------|-----------|-------------|
| `basic_iaas` | AWS · Azure · GCP · OCI · Hetzner | VPC + Subnet + Security Group + two VMs |
| `basic_container_platform` | AWS · Azure · GCP | VPC + Subnet + SG + container platform + two workloads |
| `basic_cicd` | AWS | CI/CD pipeline deployment with wait mode |
| `basic_storage` | AWS · Azure · GCP | PostgreSQL DBMS + Database + object storage |
| `basic_messaging` | Azure · GCP | Message broker + two topics |
| `basic_big_data` | AWS · Azure · GCP | Databricks workspace + cluster + job + MLflow |
| `basic_api_management` | AWS · Azure · GCP | API Gateway |
| `basic_observability` | CaaS | Monitoring + tracing + logging (Prometheus, Jaeger, Elastic) |
| `basic_security` | CaaS | Service mesh (Ocelot) |

## Architecture

```
src/
  custom/            # Custom aria component factories (Custom.blueprint, Custom.offer)
  fractal/           # Cloud-agnostic blueprint helpers
    component/
      network_and_compute/   # VirtualNetwork, Subnet, SecurityGroup, VirtualMachine, ContainerPlatform
      custom_workloads/      # Workload
      storage/               # FilesAndBlobs, RelationalDbms, DocumentDbms, Search, etc.
      messaging/             # Broker, Entity
      big_data/              # DistributedDataProcessing, ComputeCluster, DataProcessingJob, etc.
      api_management/        # ApiGateway
      observability/         # Monitoring, Tracing, Logging
      security/              # ServiceMesh
  live_system/       # Provider-specific helpers
    component/
      network_and_compute/   # AWS, Azure, GCP, OCI, Hetzner, VMware, Aruba (IaaS) + OpenShift (CaaS) + AWS/Azure/GCP/Aruba (PaaS)
      custom_workloads/      # OpenShift, generic Kubernetes (CaaS)
      storage/               # AWS S3, Azure Storage/CosmosDB/PostgreSQL, GCP Storage/Firestore/BigTable, Aruba MySQL/MsSQL/Object/Block, OpenShift PV
      messaging/             # Azure ServiceBus/EventHub, GCP PubSub, CaaS Kafka
      big_data/              # AWS/Azure/GCP Databricks + Datalake, Aruba S3 Datalake, CaaS Spark (Operator/Cluster/Job/MLflow)
      api_management/        # AWS CloudFront, Azure API Management, GCP API Gateway, CaaS Ambassador/Traefik
      observability/         # CaaS Prometheus, Jaeger, Elastic
      security/              # CaaS Ocelot
```

## Debug logging

Set `FRACTAL_DEBUG=true` to log every outbound HTTP request and every inbound response to stdout. This covers all API calls made by `fractal.deploy()`, `liveSystem.deploy()`, `fractal.destroy()`, and `liveSystem.destroy()`.

```
[2026-03-11T14:23:00Z] DEBUG → GET https://api.fractal.cloud/livesystems/my-ls
[2026-03-11T14:23:00Z] DEBUG ← 404 GET https://api.fractal.cloud/livesystems/my-ls  body=null
[2026-03-11T14:23:00Z] DEBUG → POST https://api.fractal.cloud/livesystems  body={"liveSystemId":"..."}
[2026-03-11T14:23:00Z] DEBUG ← 201 POST https://api.fractal.cloud/livesystems  body=null
```

- Authentication headers (`X-ClientID`, `X-ClientSecret`) are never logged.
- Request and response bodies are truncated to 2 000 characters.
- Both success and error responses are logged.
- Works in all deploy modes (`fire-and-forget` and `wait`).

```bash
FRACTAL_DEBUG=true node build/src/index.js
```

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
