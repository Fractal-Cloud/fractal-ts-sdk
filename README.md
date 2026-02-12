# Fractal Cloud TypeScript SDK

[![NPM Version][npm-image]][npm-url]
[![build status][build-image]][build-url]
[![license][license-image]](LICENSE)
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![codecov][codecov-image]][codecov-url]
[![TypeScript Style Guide][gts-image]][gts-url]

## Overview

The Fractal TypeScript SDK is an early stage but production ready SDK that allows platform engineers and application developers to define cloud agnostic infrastructure blueprints using TypeScript.
It is designed to bridge software architecture and infrastructure automation, enabling teams to express infrastructure intent in a general purpose language without relying on vendor specific tools or domain specific languages.
With Fractal, infrastructure is no longer written as low level scripts. It is modeled as reusable architectural building blocks that can be validated, governed, and evolved over time.
This SDK is currently at version 1.0.0. It supports Blueprint and Live System definition and deployment and is intended for early production pilots and platform experimentation.

## Why Fractal

Modern infrastructure automation forces teams to choose between flexibility and control.

Traditional Infrastructure as Code approaches are:

1. Tightly coupled to a specific cloud vendor
2. Based on string heavy DSLs
3. Difficult to govern at scale
4. Focused on resources rather than architecture

Fractal Cloud takes a different approach.

Fractal Cloud allows you to:

1. Define infrastructure as architecture, not scripts
2. Use TypeScript instead of a DSL
3. Encode governance and intent directly into reusable blueprints
4. Remain cloud-agnostic by design

This SDK is the programmatic interface to that model.

## Core concepts in one minute

You do not need prior knowledge of Fractal to use this SDK, the most important concepts are explained below.

### Fractal

A Fractal is a governed, reusable infrastructure construct.
It defines what an infrastructure system is allowed to be, not just what it deploys.
It is composed by a Blueprint and an Interface.

#### Blueprint

A Blueprint is the static definition of a Fractal.
It describes components, their relationships, and their architectural intent.

#### Interface

An Interface is the versioned set of operations through which a Fractal can be specialized or extended. 
These operations may involve the addition, removal, or modification of components and their integrations within the Fractal.

### Live System

A Live System is a running instance of a Fractal deployed to a cloud environment.
Live Systems are not yet supported in the TypeScript SDK.

For a deeper explanation of Fractal Architecture, see the documentation linked below.

## What this SDK does today

Version 1.0.0 supports the following capabilities.

* Definition of Fractal Blueprints
* Deployment of Blueprints to Fractal Cloud
* Definition of Live Systems
* Deployment of Live Systems to a specified Fractal Cloud Environment
* Usage from both personal and organization owned accounts

This SDK does not yet support:

* Fractal Interface definition
* Bounded Context helpers
* Environment helpers

## Architectural positioning

The Fractal TypeScript SDK acts as a bridge between software architecture and infrastructure automation.

It allows teams to:

* Describe infrastructure using architectural concepts
* Keep infrastructure definitions vendor neutral
* Rely on the Fractal Automation Engine to interpret and enforce those definitions

This SDK does not replace cloud providers, nor does it expose raw infrastructure primitives.
Instead, it defines intent and delegates execution to the Fractal Automation Engine.

This is Infrastructure as Code without cloud-specific code.

## Installation

The SDK is published as a public npm package.

```bash
npm install @fractal_cloud/sdk
```

[Package page](https://www.npmjs.com/package/@fractal_cloud/sdk)

[Source repository](https://github.com/Fractal-Cloud/fractal-ts-sdk)

Node.js and TypeScript requirements are documented in the repository and follow standard modern LTS versions.

## Minimal example

The following example defines and deploys the smallest useful Fractal Blueprint supported today.

It creates a Fractal with a single component and deploys the Blueprint to Fractal Cloud.

```js
// The Bounded Context ID is used to group Blueprints and Live System in order to granularly control access within an Organization
const bcId = BoundedContext.Id.getBuilder()
  .withOwnerType(OwnerType.Personal)
  .withOwnerId(OwnerId.getBuilder()
    .withValue("00000000-0000-0000-0000-000000000000")
    .build())
  .withName(KebabCaseString.getBuilder().withValue("test").build())
  .build();

// Service account credentials are obtained from environment variables
const serviceAccountCredentials = ServiceAccountCredentials.getBuilder()
  .withId(ServiceAccountId.getBuilder().withValue(process.env['SERVICE_ACCOUNT_ID']).build())
.withSecret(process.env['SERVICE_ACCOUNT_SECRET'])
.build();

// The Fractal is defined using the Builder pattern
const fractal = Fractal.getBuilder()
  .withId(Fractal.Id.getBuilder()
    .withBoundedContextId(bcId)
    .withName(KebabCaseString.getBuilder().withValue("fractal-from-ts").build())
    .withVersion(Version.getBuilder().withMajor(1).withMinor(0).withPatch(0).build())
    .build())
  .withComponent(Fractal.Component.getBuilder()
    .withId(Fractal.Component.Id.getBuilder()
      .withValue(KebabCaseString.getBuilder().withValue("container-orchestrator").build())
      .build())
    .withVersion(Version.getBuilder().withMajor(1).withMinor(0).withPatch(0).build())
    .withDescription("Container orchestrator for the fractal")
    .withDisplayName("Container orchestrator")
    .withType(Fractal.Component.Type.getBuilder()
      .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
      .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
      .withName(PascalCaseString.getBuilder().withValue("Kubernetes").build())
      .build())
    .build())
  .build();

// Blueprint deployment is initiated using the deploy method on the Fractal object
await fractal.deploy(serviceAccountCredentials);
```
Important notes:

* This code defines and deploys a Blueprint, not a Live System
* Deployment registers the Blueprint with Fractal Cloud
* No cloud resources are provisioned at this stage

The following code instead, uses the same Blueprint to deploy a Live System to a specified Fractal Cloud Environment.

```js
// The Live System is defined using the Builder pattern
const liveSystem = LiveSystem.getBuilder()
  .withId(LiveSystem.Id.getBuilder()
    .withBoundedContextId(bcId)
    .withName(KebabCaseString.getBuilder().withValue("live-system-from-ts").build())
    .build())
  .withComponent(LiveSystem.Component.getBuilder()
    .withId(fractal.components[0].id)
    .withDescription(fractal.components[0].description)
    .withType(fractal.components[0].type)
    .withDisplayName(fractal.components[0].displayName)
    .withVersion(fractal.components[0].version)
    .build())
  .withDescription('Live System deployed from TypeScript')
  .withFractalId(fractal.id)
  .withGenericProvider('Azure')
  .withEnvironment(Environment.getBuilder()
    .withId(Environment.Id.getBuilder()
      .withOwnerType(OwnerType.Personal)
      .withOwnerId(OwnerId.getBuilder().withValue('00000000-0000-0000-0000-000000000000').build())
      .withName(KebabCaseString.getBuilder().withValue('test').build())
      .build())
    .build())
  .build();

// Deployment is initiated using the deploy method on the Live System object
await liveSystem.deploy(serviceAccountCredentials);
```

## Current limitations

This version intentionally exposes the raw model.

Known limitations include:

1. No typed helpers for component types
2. No Bounded Context or Environment abstractions
3. API surface still evolving

These limitations are addressed in the roadmap below.

## Roadmap

Planned development priorities are:

1. Syntax sugar and typed helpers
2. Bounded Context support
3. Environment support

The API is expected to evolve as these capabilities are introduced. Feedback from early users will directly influence design decisions.

## Samples and learning resources

[Sample repository](https://github.com/Fractal-Cloud/fractal-ts-sdk-samples)

[Fractal Architecture documentation](https://docs.fractal.cloud/)

## Contributing and feedback

Contributions and feedback are welcome.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines

Use GitHub Issues for bugs and feature requests

Use GitHub Discussions for design and architectural questions

Direct contact and Slack channels are available for early adopters

This SDK is being built in close collaboration with its users.

## License

This project is licensed under GPLv3.

See the [LICENSE](LICENSE) file for details.

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
