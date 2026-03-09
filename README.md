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
- **IaaS helpers** for AWS, Azure, GCP, OCI, and Hetzner
- **PaaS helpers** for AWS ECS (cluster, task definition, service)

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

## Multi-provider support

The same blueprint can be deployed on any supported provider. Live system files are short and only contain vendor-specific parameters — all structural decisions (dependencies, traffic rules, security rules) stay in the blueprint.

| Blueprint component | AWS | Azure | GCP | OCI | Hetzner |
|---------------------|-----|-------|-----|-----|---------|
| `VirtualNetwork` | `AwsVpc` | `AzureVnet` | `GcpVpc` | `OciVcn` | `HetznerNetwork` |
| `Subnet` | `AwsSubnet` | `AzureSubnet` | `GcpSubnet` | `OciSubnet` | `HetznerSubnet` |
| `SecurityGroup` | `AwsSecurityGroup` | `AzureNsg` | `GcpFirewall` | `OciSecurityList` | `HetznerFirewall` |
| `VirtualMachine` | `Ec2Instance` | `AzureVm` | `GcpVm` | `OciInstance` | `HetznerServer` |

PaaS and CaaS helpers are also available for AWS ECS (cluster, task definition, service) and the agnostic `ContainerPlatform` / `Workload` blueprint types.

## Samples

The [sample repository](https://github.com/Fractal-Cloud/fractal-ts-sdk-samples) contains ready-to-run examples:

| Sample | Description |
|--------|-------------|
| `basic_iaas` | VPC + Subnet + Security Group + two VMs — deploys on AWS, Azure, GCP, OCI, or Hetzner via `CLOUD_PROVIDER` env var |
| `basic_container_platform` | ECS Fargate — VPC + Subnet + Security Group + ECS Cluster + two workloads |

## Architecture

```
src/
  fractal/           # Cloud-agnostic blueprint helpers
    component/
      network_and_compute/iaas/   # VirtualNetwork, Subnet, SecurityGroup, VirtualMachine
      network_and_compute/paas/   # ContainerPlatform
      custom_workloads/caas/      # Workload
  live_system/       # Provider-specific helpers
    component/
      network_and_compute/iaas/   # AWS, Azure, GCP, OCI, Hetzner components
      network_and_compute/paas/   # AwsEcsCluster, AwsEcsTaskDefinition, AwsEcsService
```

## Contributing and feedback

Contributions and feedback are welcome.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines. Use GitHub Issues for bugs and feature requests, and GitHub Discussions for design questions.

## License

Licensed under GPLv3. See the [LICENSE](LICENSE) file for details.

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
