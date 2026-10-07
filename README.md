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

> [!IMPORTANT]
> **Upgrading from 2.4.4 or earlier and using `AzureServiceBus`?** 2.4.5 changed the
> default Service Bus namespace SKU from the agent's Basic to `Standard`. Deploying
> an existing Basic namespace on 2.4.5 or later **deletes that namespace** and
> everything in it, because the agent has no in-place SKU update path. Pin
> `skuTier: 'Basic'` to keep it. Full detail in
> [`CHANGELOG.md`](./CHANGELOG.md) (shipped inside the package) and under
> [Service Bus namespace SKU](#service-bus-namespace-sku-skutier).

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
import {createFractalCloudClient} from '@fractal_cloud/sdk';
import {authorFractal} from './fractal';
import {liveSystem} from './aws_live_system';

const cloud = createFractalCloudClient({
  clientId: process.env['SERVICE_ACCOUNT_ID']!,
  clientSecret: process.env['SERVICE_ACCOUNT_SECRET']!,
});

await cloud.blueprints.create(authorFractal());
await cloud.liveSystems.deploy(liveSystem, {mode: 'wait'});
```

## The client

`createFractalCloudClient({clientId, clientSecret, baseUrl?})` holds your credentials once — no operation takes them as an argument. Operations are grouped by the entity they act on:

| Namespace | Operations |
|---|---|
| `cloud.blueprints` | `create(fractal)` |
| `cloud.liveSystems` | `deploy(ls, opts?)`, `outputs(ls)`, `destroy(ls)` |
| `cloud.environments` | `deploy(management, opts?)`, `list({type, ownerId})`, `get(id)` |

Pass `baseUrl` to target a non-production control plane.

### Retries through a brief control-plane outage

A control-plane rollout or restart can answer `502`/`503`/`504` or drop the connection for a short while. The client repeats a call when repeating it is safe, with exponential backoff and jitter (1 s doubling to 15 s), honoring `Retry-After`; no retry starts more than 2 minutes after the first attempt (an attempt in flight is not cut short). Inside a wait-mode deploy or agent update that is not `quiet`, each retry logs one line in the wait-mode format:

```
[2026-10-02T09:00:01.000Z] WARN  Control plane unavailable, retrying  method=GET path=/environments/Personal/<owner>/dev cause=503 attempt=1 retryInMs=730 elapsed=0s
```

| Call | Repeated on |
|---|---|
| `GET`, `PUT` (reads; environment, secret and live-system updates are whole-state overlays) | `502`, `503`, `504`, `ECONNRESET`, `ECONNREFUSED`, `ETIMEDOUT`, `EPIPE`, `EAI_AGAIN`, socket hang up |
| `POST`, `DELETE` (initialize, update, create, destroy) | only when nothing can have started: the control plane's drain refusal (`503`, `reasonCode: ServiceDraining`), the ingress's own plain-text `503` for a request that never reached a pod (the whole body is `no healthy upstream`, or `upstream connect error ... reset reason: connection failure` / `overflow`, and no upstream timing header), or a refused connection |

A `POST .../initialize` is not idempotent — a second accepted initialize starts a second run — so it is never repeated on `502`, `504`, a reset connection or a timeout. `4xx` and `500` are never repeated. Tune or disable it with `retry`:

```typescript
createFractalCloudClient({clientId, clientSecret, retry: {maxElapsedMs: 300_000}});
createFractalCloudClient({clientId, clientSecret, retry: false});
```

Outside those operations (`environments.get`, `list`, `liveSystems.outputs`, ...) retries are silent by default, so a script that pipes a result to a file gets no log lines in it; `retry: {quiet: false}` turns the lines on for every call, `retry: {quiet: true}` off for every call.

### Errors — safe to log

Every operation throws **`FractalApiError`**, never the underlying HTTP client's
error object:

```ts
import {FractalApiError} from '@fractal_cloud/sdk';

try {
  await cloud.liveSystems.deploy(liveSystem);
} catch (err) {
  if (err instanceof FractalApiError) {
    console.error(err.status, err.reasonCode, err.responseBody);
  }
  // Logging the error object itself is safe — see below.
  console.error(err);
  process.exit(1);
}
```

| Field | |
|---|---|
| `status` | HTTP status, when the failure was a response |
| `method` / `url` | the request that failed, query string removed |
| `reasonCode` | the API's error code, e.g. `BlueprintDoesNotExist` |
| `responseBody` | redacted, length-bounded preview of the response body |

**What is covered.** Two layers, because the two exposures are different:

1. **The request** — dropped, structurally. The error carries no request or response
   object, so nothing that held a header can be printed. This covers the client
   credentials *and* the provider credentials an `environments.deploy` sends (Azure
   SP secret, GCP service-account key, AWS keys), plus environment secret values and
   CI/CD private keys in request bodies.
2. **The response body**, which the SDK does quote — every secret it sent for that
   operation is redacted out of it first, matching the raw value and its
   JSON-escaped spellings to arbitrary nesting depth, before any length clip.

Known limit, stated so the guarantee is not read as wider than it is: redaction
matches raw and JSON-escaped spellings. A server that echoed a credential back
**percent-encoded or base64'd** would not match, and no redactor can enumerate every
encoding — which is why layer 1, not layer 2, is what protects the request.

**Why this type exists.** Your credentials travel as request headers. The HTTP
client's error object carries the raw request header block, so `console.error(err)`
on it printed your client secret — 84,937 bytes of output containing the secret, on
the most ordinary failure there is: a mistyped credential returning 403.
`FractalApiError` carries no request or response object and no `cause` chain leading
back to one, so `console.error(err)` is safe to leave in your `catch`. A caller who
previously read `err.response.body` should read `err.responseBody` (or
`err.reasonCode`).

## Blueprint and Live System are separate

A **Blueprint** and a **Live System** are different entities, registered by different calls:

- `cloud.blueprints.create(fractal)` registers the **abstract** blueprint — Level-1 Component contracts (`Storage.ObjectStorage`) carrying no vendor identity. It stays satisfiable by any vendor's Offer, which is what makes a Fractal reusable.
- `cloud.liveSystems.deploy(liveSystem)` deploys one **vendor-resolved** instantiation — Offer types (`Storage.PaaS.AwsS3`) plus `provider`/`deliveryModel`.

Deploying never registers a blueprint as a side effect. The API rejects a Live System whose Fractal is not registered, so register it first — or once, ahead of time, from wherever you govern your Fractals. `blueprints.create` accepts a **base** Fractal only; a specialized one carries application-level intent and is rejected at compile time.

## Cross-Live-System references

A Live System can use a component that **another Live System owns**. This is how an app team consumes shared infrastructure that ops runs: the app's Live System runs on the shared cluster instead of creating its own. To do this, fill the slot with `referenceTo(offer, {liveSystemId, componentId})` instead of an offer. `liveSystemIdOf(boundedContext, liveSystemName)` builds the id the control plane gives a Live System: `<ownerType>/<ownerId>/<boundedContext>/<liveSystemName>`.

The example below is an app Live System that runs on the EKS cluster `eks`. That cluster belongs to the ops Live System `shared-eks` in the Bounded Context `fractal-cloud-platform`. The same code is typechecked in [`guides/cross-live-system-references`](guides/cross-live-system-references/src/app_live_system.ts).

```typescript
import {
  createFractal,
  ContainerPlatform,
  Workload,
  Eks,
  K8sWorkload,
  liveSystemIdOf,
  referenceTo,
} from '@fractal_cloud/sdk';

// References work only inside one organization, so a single id serves both teams.
const organizationId = process.env['ORGANIZATION_ID']!;

// Builds the control-plane id of the ops Live System:
// `Organizational/<organizationId>/fractal-cloud-platform/shared-eks`.
const sharedEks = liveSystemIdOf(
  {
    ownerType: 'Organizational',
    ownerId: organizationId,
    name: 'fractal-cloud-platform',
  },
  'shared-eks',
);

export const ordersService = createFractal({
  id: 'orders-service',
  version: {major: 1, minor: 0, patch: 0},
  // The app's own Bounded Context. It may differ from the target's.
  boundedContextId: {
    ownerType: 'Organizational',
    ownerId: organizationId,
    name: 'orders',
  },
  blueprint: bp => {
    const cluster = bp.add(ContainerPlatform({id: 'cluster'}));
    const api = bp.add(
      Workload({id: 'orders-api'})
        .withImage('ghcr.io/acme/orders-api:1.4.2')
        .withPort(8080)
        // The dependency names the LOCAL id `cluster`, never `eks`.
        .dependsOn(cluster),
    );
    return {cluster, api};
  },
});

export const ordersLiveSystem = ordersService.specialize().toLiveSystem({
  name: 'orders',
  // Must be the environment the shared cluster runs in.
  environment: {
    ownerType: 'Organizational',
    ownerId: organizationId,
    name: 'prod',
  },
  select: {
    // `Eks` names the target's offer. It must satisfy the slot's Component, just
    // as an ordinary selection must. Its configuration is never sent.
    cluster: referenceTo(Eks, {liveSystemId: sharedEks, componentId: 'eks'}),
    'orders-api': K8sWorkload({namespace: 'orders'}),
  },
});
```

The `cluster` slot is emitted like this:

```json
{
  "id": "cluster",
  "type": "NetworkAndCompute.PaaS.AwsEks",
  "provider": "AWS",
  "deliveryModel": "PaaS",
  "reference": {
    "liveSystemId": "Organizational/<organizationId>/fractal-cloud-platform/shared-eks",
    "componentId": "eks"
  },
  "parameters": {},
  "dependencies": [],
  "links": []
}
```

Rules to know:

- **Local ids.** The reference keeps the slot's own id (`cluster`). Every dependency and link in the referencing Live System names that local id: `orders-api` depends on `cluster`. The target's id (`eks`) appears only inside `reference`.
- **No parameters, dependencies or links of its own.** A reference can never change the target. The control plane mirrors the target's parameters, output fields and status onto it, read-only, and no agent reconciles it. When the slot is built:
  - Its guardrail parameters and dependencies are dropped. They belong to the owning Live System.
  - Its outbound links and any children an operation added under it are refused with an error, because nothing would ever act on them. Declare the link from the other side instead: a workload links *to* the reference. For a child, make it a top-level component that depends on the reference.
  - The offer must satisfy the slot's Component, the same as an ordinary selection. A mismatch is a compile-time error and also throws.
- **Same environment and organization only.** The target must run in the environment the referencing Live System is deployed to, inside the same organization. The Bounded Context may differ, as `orders` and `fractal-cloud-platform` do above. Cross-environment and cross-organization references are refused (`ComponentReferenceOutsideEnvironment`).
- **Read access.** The caller deploying the referencing Live System needs read access to the target Live System, or the control plane refuses it with 401 `InsufficientRights`. A reader without that access sees the reference without the mirrored values. The response says why.
- **Feature flag.** The control plane accepts references only when `COMPONENT_REFERENCES_ENABLED=true` is set on the Live Systems service. It is off by default. Until it is enabled, a deploy that declares a reference is refused with `ComponentReferencesNotEnabled`. It must be enabled only after every agent in the environment ships the reference skip guards. An older agent would reconcile the reference as if it owned the target.
- **No chains.** The target must be a real component, not itself a reference (`ComponentReferenceChain`). The type and provider must equal the target's (`ComponentReferenceTypeMismatch`). The target must exist (`ComponentReferenceTargetNotFound`). A component that has already been reconciled cannot be turned into a reference in place.
- **Lifecycle.** A component that another Live System references cannot be deleted (`409 ComponentReferencedByAnotherLiveSystem`), and neither can its Live System. Deleting the referencing Live System removes only the reference, never the target. A dependent of the reference waits until the mirrored status is Active.

## Deployment modes

`cloud.liveSystems.deploy(liveSystem, options)` supports two modes.

### Fire and forget (default)

Submits the live system and returns immediately. Provisioning happens asynchronously. This is the default when no options are passed.

```typescript
await cloud.liveSystems.deploy(liveSystem);
await cloud.liveSystems.deploy(liveSystem, {mode: 'fire-and-forget'}); // equivalent
```

Best for: **applications, CLIs, scripts** where infrastructure deployment is a background concern.

### Wait for Active

Submits, then polls until the live system reaches `Active`. Throws on terminal failure (`FailedMutation`, `Error`) or timeout.

```typescript
await cloud.liveSystems.deploy(liveSystem, {
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
await cloud.liveSystems.destroy(liveSystem);
```

Tears down that instantiation; the registered blueprint stays put.

## Environments as code

An environment is a control-plane resource a Live System is deployed into: a
**management** environment owns the cloud agents, and each **operational**
environment declares the cloud account its workloads land in. Declare the tree,
then `cloud.environments.deploy(...)` creates or updates every environment, pushes
secrets and CI/CD profiles, and initializes the cloud agents — management first.

The example below is a landing zone with the management environment in one AWS
account and two operational environments in two more, deployed from GitHub
Actions with a separate credential set per account.

```ts
import {
  createFractalCloudClient,
  ManagementEnvironment,
  OperationalEnvironment,
  type ProviderCredentials,
} from '@fractal_cloud/sdk';

const ORG = process.env.FRACTAL_ORG_ID!; // Organizational owner id (a GUID)
const rg = (name: string) => `Organizational/${ORG}/${name}`;

const management = ManagementEnvironment({
  id: {type: 'Organizational', ownerId: ORG, shortName: 'mgmt'},
  name: 'Management',
  resourceGroups: [rg('platform')],
})
  .withAwsCloudAgent({
    region: 'eu-central-1',
    organizationId: 'o-abc123def4',
    accountId: '111111111111',
  })
  // No networkTier here: a management tier is inherited by EVERY operational
  // environment and overrides theirs. Leave it unset to tier them individually.
  .withOperationalEnvironment(
    OperationalEnvironment({shortName: 'prod', resourceGroups: [rg('prod')]})
      .withAwsAccount({region: 'eu-central-1', accountId: '222222222222'})
      .withNetworkTier('prod'),
  )
  .withOperationalEnvironment(
    OperationalEnvironment({shortName: 'dev', resourceGroups: [rg('dev')]})
      .withAwsAccount({region: 'eu-central-1', accountId: '333333333333'})
      .withNetworkTier('nonprod'),
  );

// One credential set per AWS account, exported by the workflow (below).
const awsFor = (prefix: string): ProviderCredentials => ({
  aws: {
    accessKeyId: process.env[`${prefix}_AWS_ACCESS_KEY_ID`]!,
    secretAccessKey: process.env[`${prefix}_AWS_SECRET_ACCESS_KEY`]!,
    sessionToken: process.env[`${prefix}_AWS_SESSION_TOKEN`]!,
  },
});
const byEnvironment: Record<string, ProviderCredentials> = {
  mgmt: awsFor('MGMT'),
  prod: awsFor('PROD'),
  dev: awsFor('DEV'),
};

const cloud = createFractalCloudClient({
  clientId: process.env.SERVICE_ACCOUNT_ID!,
  clientSecret: process.env.SERVICE_ACCOUNT_SECRET!,
});

await cloud.environments.deploy(management, {
  // A function is asked per environment, right before that environment's agent is
  // initialized (and only if it needs to be). It receives
  // {environment, tier, provider, accountId, region} and may be async — e.g. to
  // call sts:AssumeRole into `accountId` just in time.
  providerCredentials: ({environment}) => byEnvironment[environment.shortName],
  // Required for a new tree: the control plane refuses an operational
  // initialization until the management one has Completed.
  agentInit: 'wait',
});

// What is there now?
for (const env of await cloud.environments.list({
  type: 'Organizational',
  ownerId: ORG,
})) {
  console.log(env.id.shortName, env.status, env.initializedClouds.join(','));
}
const prod = await cloud.environments.get({
  type: 'Organizational',
  ownerId: ORG,
  shortName: 'prod',
});
console.log(prod?.parameters.networkTier); // 'prod'
```

```yaml
# .github/workflows/environments.yml (excerpt)
permissions:
  id-token: write
  contents: read
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    id: mgmt
    with:
      role-to-assume: arn:aws:iam::111111111111:role/fractal-init
      aws-region: eu-central-1
      output-credentials: true
  # ...same for `prod` (222222222222) and `dev` (333333333333)
  - run: npx tsx environments.ts
    env:
      MGMT_AWS_ACCESS_KEY_ID: ${{ steps.mgmt.outputs.aws-access-key-id }}
      MGMT_AWS_SECRET_ACCESS_KEY: ${{ steps.mgmt.outputs.aws-secret-access-key }}
      MGMT_AWS_SESSION_TOKEN: ${{ steps.mgmt.outputs.aws-session-token }}
      # PROD_AWS_..., DEV_AWS_... likewise
```

**Recommended setup:** run this from GitHub Actions with GitHub OIDC, one deployer
role per AWS account, and no static AWS keys. See
[guides/github-actions](guides/github-actions/README.md) for the role trust
policy, deploy and pull-request workflows, and sample scripts.

Things to know:

- **`providerCredentials`** is either one object, used for every environment in the
  tree (as before), or a function asked per environment and agent. Credentials a
  function returns are redacted from errors like static ones.
- **AWS credentials** are a session (`accessKeyId`, `secretAccessKey`,
  `sessionToken`), long-lived keys (`accessKeyId`, `secretAccessKey`, sent as they
  are), or web identity (`roleArn`, `webIdentityToken`, which the control plane
  exchanges itself). The last two need fractal-environments v3.32.0 or later: an
  older control plane may ignore them and use AWS credentials it already holds. A set
  missing a key, or with an empty `sessionToken`, is refused before anything is
  sent.
- **Order.** Management is initialized first, then each operational environment.
  With `agentInit: 'wait'` each initialization is awaited before the next starts.
  With the default `fire-and-forget`, an operational agent whose management agent
  has not completed yet is skipped with a notice and left for a later run (see
  [Deploy from CI](#deploy-from-ci)); `pendingManagement: 'fail'` throws instead,
  naming `agentInit: 'wait'`.
- **Parameters merge on update.** The API replaces an environment's parameters
  wholesale on update, so a deploy starts from what the server holds and writes
  only the keys this tree declares (agents, tags, DNS zones, `withNetworkTier`,
  `withParameter`). A key set elsewhere — a `networkTier` chosen in the web UI,
  entries the server records itself — is kept. Removing a `withTags` or
  `withNetworkTier` call from your code therefore does **not** clear the stored
  value: declare it absent with `withParameter('tags', null)` /
  `withParameter('networkTier', null)`.
- **`networkTier`** (`'prod'` / `'nonprod'`, unset means `nonprod`) is read when the
  AWS agent is initialized. The management environment's tier wins over an
  operational one's. Declaring two different tiers is refused at resolve time, and
  an operational tier that a tier STORED on the management environment would
  override is refused at deploy time, before the operational environment is
  written.
- **`environmentSecretsBackend`** (`withEnvironmentSecretsBackend`) picks where the
  AWS agent stores environment secrets: `'ssm-parameter-store'` (the default; SSM
  `SecureString` parameters under `/fractal/environment-secrets/<environment>/`,
  values up to 4096 bytes) or `'secrets-manager'` (the legacy `secret-<uuid>`
  secrets). It applies per environment and is not inherited from the management
  environment. Switching does not migrate or delete the secrets already in the
  other store. Any other value, and on an AWS environment using the SSM backend a
  secret over 4096 bytes, is refused at resolve time.

### Updating cloud agents

An agent initialized before a permission was added to its role does not get that
permission from a deploy: its initialization is `Completed`, so nothing is sent.
`reinitializeAgents` re-runs the whole initialization. An **update** is smaller. The
control plane re-runs the agent's role and permission steps, refreshes its
credential mirror and compute, and redeploys it on the latest published version:

```ts
await cloud.environments.updateAgents(management, {
  // Optional: which agents to update. Default: every agent the tree declares.
  // Receives {environment, tier, provider, accountId, region}.
  only: ({environment, provider}) =>
    environment.shortName === 'mgmt' && provider === 'AWS',
  // 'wait' polls each update to Completed (or throws with the failing step).
  agentUpdate: 'wait',
});
```

- **Calls** `POST /environments/{type}/{ownerId}/{shortName}/initializer/{aws|azure|gcp}/update`
  per agent: management environment first, then each operational one. The request
  has no body and is answered `202`. The run is then read from the same `.../status`
  endpoint initialization uses.
- **Writes no environment.** Deploy first if the tree changed.
- **AWS, Azure and GCP only.** Selecting an OCI or Hetzner agent is refused before any
  request is sent. The control plane refuses (`400`) an agent that was never
  initialized, one that is already updating, and a provider with no published
  agent version.
- **One agent at a time.** A refusal or failure stops the call there. Agents before
  it stay updated, and the ones after it are not started.
- **`providerCredentials`** (an object or a resolver, as for `deploy`) is optional,
  and so is each provider in it. Credentials given for an agent's provider are sent
  as the same headers `initialize` uses. An agent whose provider gets none is updated
  without them. The control plane updates with the credentials sent
  (fractal-environments v3.32.0 or later). An older one updates with the
  credentials it already holds for the environment; one initialized with
  short-lived credentials may hold none by then, and its update fails at the first
  step that needs them (reported with the step's message under `agentUpdate:
  'wait'`).

### Reading DNS zone results

Zones declared with `withDnsZones` are realized by the environment's agents, in the
account / project / subscription of the environment that declares them. You do not
choose where: every agent of the environment that hosts DNS zones hosts its own
copy, with the same records.

```ts
mgmt
  .withAwsCloudAgent({region: 'eu-central-1', organizationId: 'o-abc123', accountId: '123456789012'})
  .withDnsZones([{name: 'fractal.cloud'}, {name: 'yanchware.com'}]);
```

Which agents host DNS zones is what each agent declares to the control plane, so a
new kind of agent hosts them as soon as it says it can, with no SDK change.

To narrow a zone to some of the environment's agents, list them in `agents` — the
declared agent itself, or its id (`aws`, `gcp`, `azure`, see `agentIdOf`; an agent
bound by name, such as an ARIA agent, is `{type}:{shortName}`, e.g. `aria:caas-k8s`):

```ts
import type {CloudAgent} from '@fractal_cloud/sdk';

const gcp: CloudAgent = {provider: 'GCP', region: 'europe-west1', organizationId: '123456789', projectId: 'mgmt'};
mgmt
  .withCloudAgent(gcp)
  .withDnsZones([{name: 'internal.fractal.cloud', agents: [gcp], dnssec: 'required'}]);
```

- Selecting an agent object the environment does not declare, an empty `agents`,
  or text that is not an agent id is refused when the tree is resolved; selecting an
  agent the environment does not have, or one that does not host DNS zones, is
  refused by the control plane. Removing an agent from `agents` tears its copy down.
- A zone is never signed by more than one agent (multi-signer DNSSEC, RFC 8901, is
  not supported): `dnssec: 'required'` needs a single host; `'optional'` on several
  hosts is served unsigned, and a zone already signed by one agent is not copied to
  another while it reports a DS record (remove the DS at the registrar and set
  `'disabled'` first). Each zone's `unassignedReason` says when this applies.
- `dnsZoneType` is deprecated: it still selects a single agent when `agents` is not
  set.

#### Records the declaration does not list: `recordManagement`

A zone's `records` are always kept: a declared record set changed or removed outside
Fractal Cloud is put back on the next pass. `recordManagement` decides what happens to
record sets the declaration does **not** list:

- `'authoritative'` (the default, also when omitted): the declaration is the whole
  zone. Every record set it does not declare is deleted, apex NS and SOA aside,
  whoever created it.
- `'lax'`: Fractal Cloud never deletes a record set it did not define. A record set
  removed from the declaration is deleted only if it is in the last-applied set
  (`managedRecords`) the previous pass recorded (if that state is lost, the record set
  is left in place); a declared name and type that already exists with other values
  is set to the declared values (the declaration wins for the names it declares).

The SDK sends the value exactly as chosen; when the key is omitted, nothing is sent
and the agent applies `'authoritative'`. Any other value (`'additive'`, the removed
per-record ownership, included) is a type error and refused before anything is sent.
Values are matched case-sensitively.

> **`lax` requires cloud agents newer than 8.21.** Agents up to 8.21 accept only
> `'authoritative'` and fail a `lax` zone without changing it.
>
> **Upgrading the agents deletes undeclared record sets in zones that omit the key.**
> Agents up to 8.21 hold an unset zone that holds record sets nobody declared and
> Fractal Cloud did not write (an adopted zone, records made by hand, ACME
> `_acme-challenge` TXT records): nothing in it changes. Newer agents read an unset
> `recordManagement` as `'authoritative'` and delete those record sets. Before
> upgrading the agents, declare `recordManagement: 'lax'` (or list the records) on
> such zones and deploy; until the agents are upgraded, they fail those `lax` zones
> without changing them.
>
> A zone stored as `'strict'` by SDK 2.9.6 fails until it is redeclared with this
> version (`environments.plan` shows a `parameters.dnsZones` update).

Use `lax` when something else writes into the zone, the usual case being ACME DNS-01:
cert-manager or certbot creates `_acme-challenge` TXT records to prove control of the
domain. The declaration does not list them, so under `authoritative` the agent would
delete them, possibly mid-challenge; under `lax` they survive, while the declared
records are still kept and restored:

```ts
mgmt.withDnsZones([
  {
    name: 'fractal.cloud',
    recordManagement: 'lax', // cert-manager writes _acme-challenge TXT records here
    caaIssuers: ['letsencrypt.org'],
    records: [{name: 'www', type: 'CNAME', ttl: 300, values: ['fractal.cloud.']}],
  },
]);
```

Nothing is written into the zone's DNS data to track which record sets Fractal Cloud
defined (no marker TXT records): the agent remembers what it applied in control-plane
state, the zone's `managedRecords` output (`"www.fractal.cloud. CNAME"` style entries, typed
on `DnsZoneOutputs`). The same key applies to a Live System zone
(`DnsZoneComponent.withRecordManagement('lax')`).

`cloud.environments.dnsZones(id)` reads what the agents reported: per zone, one
result per agent hosting it, with the name servers and DS records a registrar needs to
delegate the domain.

```ts
const dns = await cloud.environments.dnsZones({
  type: 'Organizational',
  ownerId: ORG,
  shortName: 'prod',
});
for (const zone of dns?.zones ?? []) {
  for (const r of zone.results) {
    // r.agent: 'aws', 'aria:caas-k8s', ...; r.provider: its type ('AWS', ...);
    // r.status: 'Pending' | 'Realizing' | 'Active' | 'Failed' | 'Deleting' | 'ManualOverride'
    console.log(zone.name, r.agent, r.status, r.zoneId);
    console.log('  NS', r.nameServers.join(' '));
    for (const ds of r.dsRecords) {
      console.log('  DS', ds.keyTag, ds.algorithm, ds.digestType, ds.digest);
    }
  }
}
```

- `null` means the environment does not exist; an environment without zones
  returns `{zones: [], problems: []}`.
- An agent the zone is assigned to that has not reported yet is listed with
  status `Pending` and empty outputs. A result with `assigned: false` is a copy the
  environment no longer assigns there (held, or being torn down).
- `dsRecords` stays empty for a zone that is not signed. `outputs` carries every
  field the agent reported, including provider-specific ones.
- `unassignedReason` says why a declared zone is not hosted exactly as
  declared (a selected agent that is missing or does not host DNS zones, or DNSSEC
  that several agents cannot honor); `problems` lists declaration entries the control
  plane could not use (unreadable, or a name declared twice), and any output field
  an agent reported malformed — that field is left empty on its result rather than
  failing the whole read.
- An `ownerId` that is not a GUID, or a `shortName` over 30 characters, is refused
  before the call: the API would answer 404, which would read as a missing
  environment.

#### Deleting many record sets at once: `allowBulkDelete`

Cloud agents v8.22.0 and later guard a zone against mass deletion: a pass that
would delete at least 3 record sets **and** more than half of the zone is refused
and reported instead of applied. When such a deletion is intended, declare
`allowBulkDelete: true` on the zone (the `withDnsZones` entry, or
`DnsZoneComponent.withAllowBulkDelete(true)`):

```ts
env.withDnsZones([{name: 'fractal.cloud', records, allowBulkDelete: true}]);
```

It applies once per declaration change: the agent records a fingerprint of the
declaration when it applies the bulk delete, and while the declaration stays the
same the guard applies again and the agent reports that the flag should be
removed. Remove it afterwards. The default is `false`, and omitted, nothing is
sent. Only agents v8.22.0 and later accept the key; do not declare it on an
environment whose agents are older. A value that is not a boolean is refused
before anything is sent.

---

## Deploy from CI

The SDK carries the CI plumbing an environments-as-code repository would
otherwise write itself: minting the job's OIDC token, exchanging it per cloud,
masking secrets, annotating the run and writing its summary. It sits behind two
CI-agnostic ports, `CiIdentity` (OIDC tokens) and `CiReporter` (notice, warning,
error, mask, step summary), with adapters for **GitHub Actions** and **Azure
DevOps** and a local fallback. `detectCi()` picks the adapter from the
environment; any other CI can supply its own two adapters.

**One job per cloud.** Every job runs the same script over the whole tree, but
holds the credentials of **one** cloud only (`cloud`). The deploy initializes that
cloud's agents and skips every other cloud's with a notice; their own job
initializes them. No job ever holds another cloud's credentials. Run the jobs one
after another, since each writes the environments.

```ts
// deploy.ts — the same script in every job
import {createFractalCloudClient, credentialsFromCi, detectCi, environmentPlanMarkdown} from '@fractal_cloud/sdk';
import {trees} from './environments';

const ci = detectCi();
const cloud = createFractalCloudClient({
  clientId: process.env.FRACTAL_CLIENT_ID!,
  clientSecret: process.env.FRACTAL_CLIENT_SECRET!,
});
const providerCredentials = credentialsFromCi(ci, {
  cloud: ci.variable('FRACTAL_CLOUD'), // 'aws' | 'gcp' | 'azure', set per job
  aws: [{roleArn: 'arn:aws:iam::111111111111:role/FractalDeployer'}], // one per account
  gcp: {
    serviceAccountEmail: 'deployer@my-project.iam.gserviceaccount.com',
    workloadIdentityProvider: 'projects/123/locations/global/workloadIdentityPools/ci/providers/github',
    projectIds: ['my-project'],
  },
  azure: {clientId: '<app registration client id>', subscriptionIds: ['<subscription id>']},
});

const plan = await cloud.environments.plan(trees);
ci.reporter.appendSummary(environmentPlanMarkdown(plan));
for (const tree of trees) {
  await cloud.environments.deploy(tree, {providerCredentials, reporter: ci.reporter});
}
```

```yaml
# .github/workflows/deploy.yml — GitHub Actions
on: {push: {branches: [main]}}
permissions: {contents: read}
jobs:
  deploy:
    strategy: {max-parallel: 1, fail-fast: false, matrix: {cloud: [aws, gcp, azure]}}
    runs-on: ubuntu-latest
    environment: fractal-${{ matrix.cloud }} # protected, main only; each cloud trusts its own subject
    permissions: {id-token: write, contents: read}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: {node-version: 24}
      - run: npm ci && npx tsx deploy.ts
        env:
          FRACTAL_CLOUD: ${{ matrix.cloud }}
          FRACTAL_CLIENT_ID: ${{ secrets.FRACTAL_CLIENT_ID }}
          FRACTAL_CLIENT_SECRET: ${{ secrets.FRACTAL_CLIENT_SECRET }}
```

```yaml
# azure-pipelines.yml — Azure DevOps: one job per cloud, one after another
trigger: [main]
pool: {vmImage: ubuntu-latest}
parameters:
  - name: clouds
    type: object
    default: [{cloud: aws}, {cloud: gcp, after: deploy_aws}, {cloud: azure, after: deploy_gcp}]
jobs:
  - ${{ each c in parameters.clouds }}:
      - deployment: deploy_${{ c.cloud }}
        environment: fractal-${{ c.cloud }} # approvals and checks
        ${{ if c.after }}:
          dependsOn: ${{ c.after }}
          condition: not(canceled())
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                # AzureCLI@2 authorizes the workload-identity service connection for the job
                # and exposes its id as AZURESUBSCRIPTION_SERVICE_CONNECTION_ID.
                - task: AzureCLI@2
                  inputs:
                    azureSubscription: fractal-${{ c.cloud }}
                    scriptType: bash
                    scriptLocation: inlineScript
                    inlineScript: npm ci && npx tsx deploy.ts
                  env:
                    FRACTAL_CLOUD: ${{ c.cloud }}
                    SYSTEM_ACCESSTOKEN: $(System.AccessToken)
                    FRACTAL_CLIENT_ID: $(FRACTAL_CLIENT_ID)
                    FRACTAL_CLIENT_SECRET: $(FRACTAL_CLIENT_SECRET)
```

Azure DevOps issues tokens for one audience only, `api://AzureADTokenExchange`, and
the SDK uses it for every cloud there: a GCP workload identity provider or an AWS
IAM OIDC provider trusting an Azure DevOps organization must accept that audience.

### Credentials: OIDC (default) or CI secrets

**OIDC is the default and the recommended choice**: the job proves who it is with
a token minted for that one request, and no long-lived cloud secret exists to
leak. Each cloud's identity should trust only its own job's subject (the GitHub
environment, or the Azure DevOps service connection).

| Cloud | OIDC (default) | Audience |
|---|---|---|
| AWS | `{roleArn}`, one entry per account. The token is handed to the control plane, which exchanges it with `sts:AssumeRoleWithWebIdentity` at request time (fractal-environments v3.32.0 or later). `exchange: 'sdk'` exchanges it in the job instead and hands over the session (`sessionDurationSeconds`, default 3600), for older control planes. | `sts.amazonaws.com` |
| GCP | `{serviceAccountEmail, workloadIdentityProvider, projectIds}` | `https://iam.googleapis.com/<provider>` |
| Azure | `{clientId, subscriptionIds}` | `api://AzureADTokenExchange` |

**CI secrets (the standard way)** are a first-class alternative, per cloud.
`ciSecret('NAME')` reads a variable the job maps from the CI's protected secret
store (scope the secrets to the cloud's protected environment, so each job only
has its own) when the credential is about to be used:

```ts
credentialsFromCi(ci, {
  cloud: ci.variable('FRACTAL_CLOUD'),
  aws: {
    accountId: '111111111111',
    accessKeyId: ciSecret('AWS_ACCESS_KEY_ID'),
    secretAccessKey: ciSecret('AWS_SECRET_ACCESS_KEY'),
    sessionToken: ciSecret('AWS_SESSION_TOKEN'), // optional: long-lived keys become a session first
  },
  azure: {clientId: '<app id>', clientSecret: ciSecret('AZURE_CLIENT_SECRET'), subscriptionIds: ['<sub>']},
  gcp: {serviceAccountKey: ciSecret('GCP_SERVICE_ACCOUNT_KEY'), projectIds: ['my-project']},
});
```

Long-lived AWS keys are sent as they are, without a session token; the control
plane holds them for the run only and checks their account (fractal-environments
v3.32.0 or later). They are not exchanged for a `sts:GetSessionToken` session,
which could not call IAM without MFA. OIDC and secrets mix freely, one per cloud.

Either way, the resolver:

- mints or reads credentials per initialize request, just in time, and only for
  an agent that needs initializing;
- masks every token and secret through the CI (`::add-mask::`,
  `##vso[task.setsecret]`) before returning it, and never logs one;
- **refuses** an AWS account, GCP project or Azure subscription the configuration
  does not name, a region outside the role's partition, and, with
  `environments: [...]` (prefer full ids, `Organizational/<ownerId>/<shortName>`; a bare
  short name matches under any owner), an
  environment outside the list: the deploy fails rather than handing credentials
  to the wrong target;
- fails on a secret of its own cloud the job was not given, naming the variable.

### What a deploy does under fire-and-forget

- Management environments first, then operational ones.
- An agent of a cloud this job holds no credentials for is skipped with a notice
  (`reason: 'missing-credentials'`), and the deploy goes on with the others.
- An operational agent whose management agent has not completed its
  initialization on that cloud is skipped with a notice (`'pending-management'`)
  rather than failing the run; the operational environment is still written. The
  next run after the management initialization completes picks it up, so a daily
  scheduled run settles a new tree. `pendingManagement: 'fail'` throws instead.
- The order of an environment's agents is not a change: a deploy keeps the stored
  order when only the order differs, so it never flips between runs.
- `deploy` resolves to `{started, completed, inProgress, skipped}`.
- `environments.updateAgents(tree, {providerCredentials, reporter})` behaves the
  same way in a per-cloud job: it updates the job's own cloud's agents, sending
  the same credential headers as `initialize`, and skips the others with a
  notice. It resolves to `{started, skipped}`.

`cloud.environments.plan(trees)` previews the same decisions read-only: create
(`+`), update (`~`, with the changed fields), unchanged (`=`, with the status and
initialized clouds), or refused (`!`, an operational `networkTier` the stored
management tier would override; `plan.refused` is then true).
`formatEnvironmentPlan(plan)` renders it as lines, `environmentPlanMarkdown(plan)`
as a step-summary section.

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
| `RelationalDbms` | `AwsRdsPostgresDbms` · `AwsRdsMySqlDbms` | `AzurePostgresDbms` | `GcpPostgresDbms` | `ArubaMySqlDbms` | — | — |
| `RelationalDatabase` | `AwsRdsPostgresDatabase` · `AwsRdsMySqlDatabase` | `AzurePostgresDatabase` | `GcpPostgresDatabase` | — | — | — |

> `RelationalDatabase` components added under a DBMS via an operation are emitted by the **DBMS's own offer** in its vendor family — selecting `AzurePostgresDbms` makes its databases `AzurePostgresDatabase`. They are not independently offer-selected.

#### Amazon RDS: requiring TLS (`requireSecureTransport`)

`AwsRdsPostgresDbms` and `AwsRdsMySqlDbms` accept `requireSecureTransport?: boolean`.
It has **no default**, and the SDK sends it only when you set it:

| Value | What the agent does |
|---|---|
| unset | A **new** database gets the agent's parameter group that requires TLS (`rds.force_ssl=1` / `require_secure_transport=1`); an **existing** one is left as it is. |
| `true` | Also attaches that group to an existing database on its engine's default group. RDS applies it at the next reboot, which the agent does not force. |
| `false` | Never sets the group up. A group attached earlier is not detached. |

```ts
AwsRdsPostgresDbms({requireSecureTransport: true})
```

Turning it on for an existing database breaks every client that connects without
TLS once the database reboots. A database on an operator's own parameter group keeps
it; set the TLS parameter there. Anything other than a boolean is refused while the
Live System is built.

> Requires fractal-cloud-agents v8.22.1 deployed.

### Messaging

| Component | Azure | GCP | Self-hosted |
|---|---|---|---|
| `Broker` | `AzureServiceBus` | `GcpPubSub` | `Kafka` |
| `MessagingEntity` | `AzureServiceBusTopic` | `GcpPubSubTopic` | `KafkaTopic` |

`EmailSender` (AWS only): `AwsSesIdentity`.

#### `AwsSesIdentity` (`Messaging.PaaS.AwsSesIdentity`, AWS agent)

An SES v2 domain identity with Easy DKIM. `domain` is required; `mailFromSubdomain`
(one DNS label) sets a custom MAIL FROM `<label>.<domain>`, and unset or blank keeps
SES's own. Values are read as the agent reads them: trimmed, lower case, without a
trailing dot.

```ts
const mail = bp.add(EmailSender({id: 'mail'}));
// ...
select: {mail: AwsSesIdentity({domain: 'example.com', mailFromSubdomain: 'bounce'})}
```

The agent writes no DNS. It publishes `dkimRecords` (three CNAMEs) and, with a MAIL
FROM subdomain, `mailFromRecords` (MX and SPF), and stays `Instantiating` until SES
has verified them. Needs fractal-cloud-agents with agents #829.

**Production access.** SES starts every account in the sandbox (verified recipients
only, low quota). `productionAccess: true` has the agent request production access
once, with `websiteUrl` (http(s)) and `useCaseDescription`, both required then, plus
`mailType` (`TRANSACTIONAL` default, or `MARKETING`) and `contactLanguage` (`EN`
default, or `JA`). AWS reviews it in a Support case; the agent publishes
`productionAccessStatus` (`Sandbox`, `Pending`, `Granted`, `Denied`, `Failed`) and
does not send the request again (a denial is answered in its case).

```ts
AwsSesIdentity({
  domain: 'example.com',
  productionAccess: true,
  websiteUrl: 'https://example.com',
  useCaseDescription: 'Order receipts and password resets to our customers; bounces and complaints suppressed.',
})
```

> [!WARNING]
> Production access is **account-wide and per region**: it applies to every SES
> identity of the AWS account in that region, not only this one. It cannot be
> reverted: setting `productionAccess` back to `false` changes nothing, the agent
> only warns.

Needs fractal-cloud-agents with agents #831, and the agent role's
`ses:GetAccount` / `ses:PutAccountDetails` (fractal-environments #511, applied by an
environment update).

#### Service Bus namespace SKU (`skuTier`)

`AzureServiceBus` accepts `skuTier?: 'Basic' | 'Standard' | 'Premium'` and **defaults
to `Standard`** as of 2.4.5. Read this before upgrading across that version.

> [!WARNING]
> **Changing the SKU of a namespace that is already deployed DELETES it.** The Azure
> agent treats any difference between the requested tier and the live namespace's
> tier as an unrecoverable state: it issues an ARM delete and re-creates on the next
> reconcile pass. The namespace and every queue, topic, subscription and enqueued
> message go with it. There is no in-place SKU update path.
>
> A namespace created before 2.4.5 sits at the agent's own default, **Basic**. The
> first deploy after upgrading therefore destroys it unless you pin the tier:
>
> ```ts
> AzureServiceBus({resourceGroup: 'acme', skuTier: 'Basic'})
> ```

Why the default is `Standard`: a Basic namespace cannot host a topic at all (ARM
rejects the create with 400 SubCode=40000), and `AzureServiceBusTopic` is the only
Azure `MessagingEntity` in this catalogue. Basic namespaces do support **queues**,
but the platform's queue implementation always sets `autoDeleteOnIdle`, which Basic
does not support — so no entity the platform itself creates can live on Basic.

Basic is still the right choice for one shape: provisioning the namespace as
infrastructure and creating queues at runtime from the application
(`ServiceBusAdministrationClient.createQueue`, or framework auto-creation). Basic
carries no monthly base fee where Standard does, so pass `skuTier: 'Basic'`
explicitly for that shape — otherwise the default adds a per-namespace charge.

If an architect locks the tier on the `Broker` component
(`Broker({id: 'broker'}).withTier('Basic')`), that locked guardrail decides the SKU,
and an offer-level `skuTier` contradicting it throws rather than silently discarding
one of the two intents.

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
| `ApiGateway` | `AwsCloudFront` | `AzureApiManagement` | `GcpApiGateway` | `Ambassador` · `Traefik` · `TraefikGateway` |

#### `AwsCloudFront` origins

A distribution serves exactly one of: a linked `AwsS3` bucket (a static site), a
linked `TraefikGateway` or `Traefik` (a VPC origin), an `originDomain`, or
`redirectTo`. For a static site, link the distribution to the bucket with
`{access: 'read'} satisfies ObjectStorageLink` (`read-write` is accepted and granted
read only; the bucket may be a reference). The agent serves it through an origin
access control, with directory indexes and compression. Optional site keys, sent only
when set and accepted only with a bucket origin:

| Key | Default |
|---|---|
| `defaultRootObject` | `index.html` (the object for `/` and every `<path>/`) |
| `spaFallback` | unset: answer a missing key with the root object and 200 when `true` |
| `errorDocument` | unset: the object served with 404 for a missing key; excludes `spaFallback` |

Object keys are letters, digits and `._/-`, with no leading `/` or `.`, no `..`, at
most 255 characters. A bucket and a distribution that both declare `region`
differently are refused. The bucket origin and its keys need cloud agents v8.22.0 or
later.

#### `TraefikGateway` (`APIManagement.CaaS.TraefikGateway`, caas-k8s agent)

Traefik v3.6 installed by Helm on the cluster. On EKS it sits behind an internal
NLB that stays TCP only. List values are arrays in the SDK and travel
comma-separated. Defaults are the agent's; the SDK sends only what you set.

| Key | Type | Default |
|---|---|---|
| `namespace` | string | `traefik` |
| `replicas` | number | `2` |
| `chartVersion` | string | `39.0.9` (Traefik v3.6.15) |
| `host` | string | none (default host of every route) |
| `internalLoadBalancer` | boolean | `true` |
| `tlsCertificateArn` | string | none (NLB TLS listener; not behind a CloudFront VPC origin, not with Traefik TLS) |
| `tlsClusterIssuer` | string | none: cert-manager ClusterIssuer the gateway requests its Certificate `traefik-tls` from |
| `tlsSecretName` | string | `traefik-tls` with `tlsClusterIssuer`, else none (set alone: an operator-provided certificate) |
| `tlsHosts` | string[] | `[host]`: exact names or `*.one-label` wildcards; must cover `host`, every route host and every viewer host CloudFront forwards |
| `plainHttp` | boolean | `true` without TLS, `false` with TLS (`false` without TLS is refused) |
| `entryPointIdleTimeoutSeconds` | number | `75` |
| `loadBalancerSourceRanges` | string[] (CIDRs) | none |
| `forwardAuthAddress` | string (http(s) URL) | none = no ForwardAuth |
| `forwardAuthRequestHeaders` | string[] | `authorization,cookie,x-clientid,x-clientsecret,origin` |
| `forwardAuthResponseHeaders` | string[] | `x-jwt` |
| `forwardAuthForwardBody` | boolean | `true` |
| `forwardAuthMaxBodySize` | number | `1048576` |
| `forwardAuthExemptComponentIds` | string[] | none: workloads whose own routes skip ForwardAuth, a bare component id of the gateway's Live System or `<liveSystemId>/<componentId>` |
| `forwardAuthExcludedPrefixes` | — | **removed** from the agent; setting it is refused (a type error, and refused at runtime) |
| `values` | object | none (chart values deep-merged over the agent's) |

Traefik terminates TLS itself when `tlsSecretName` (explicit, or defaulted from
`tlsClusterIssuer`) is set: TCP 443 passes through the NLB to `websecure`, which is
what a CloudFront VPC origin can reach with `originProtocol: 'https'`. To move a
gateway to TLS without downtime, enable it with `plainHttp: true`, switch CloudFront
to `https`, then drop `plainHttp`.

```ts
TraefikGateway({
  host: 'api.fractal.cloud',
  tlsClusterIssuer: 'letsencrypt',        // a CertManager's clusterIssuerName
  plainHttp: true,                        // only while CloudFront still uses http
  forwardAuthAddress: 'http://ocelot.security.svc.cluster.local:8080/',
  forwardAuthExemptComponentIds: [`${liveSystemIdOf(platform, 'ocelot')}/ocelot`],
});
```

An empty list is refused for every list key: it would travel blank, which the agent
reads as unset and replaces with its default. Path prefixes no longer exempt a workload route: the
old default `/grafana/`, `/prometheus/`, `/alertmanager/` exemptions are gone, so
those routes are authenticated unless their workload is listed.

With TLS, every route host a workload link names (`routes.<n>.host`) and, while
CloudFront reaches the gateway over `https`, every `AwsCloudFront` alias must be
covered by the certificate (`tlsHosts`, else `host`; `*.parent` covers exactly one
label), checked when the gateway is in the same Live System. An `AwsCloudFront`
that reaches a same-Live-System gateway without TLS over `https` (its default) is
refused: that load balancer has no listener on 443.

Refused while building the Live System: `tlsHosts` or `plainHttp: false` without
TLS, `tlsCertificateArn` with Traefik TLS, TLS without `tlsHosts` or `host`, a
malformed certificate host, a `host` the certificate does not cover, an invalid
Kubernetes name, an exempt id that starts or ends with `/`, and a source range that
is not a CIDR.

Output fields: `namespace`, `serviceName`, `releaseName`, `host`, `entryPoint`
(`web` while plain HTTP is served, else `websecure`), `loadBalancerHostname`,
`forwardAuthEnabled`, `forwardAuthMiddlewareName` / `forwardAuthMiddlewareNamespace`
(with ForwardAuth), `forwardAuthExemptComponents` (always, qualified), `tlsEnabled`
and `plainHttpEnabled` (always), `tlsEntryPoint`, `tlsSecretName`, `tlsHosts`,
`tlsCertificateExpiresAt` (with TLS), `tlsCertificateName` (when the gateway
requested the Certificate). The gateway stays in progress until the served
certificate covers every `tlsHosts` entry and has not expired.

### Observability (self-hosted, CaaS)

`Monitoring.withScrapeInterval` and `Tracing.withSamplingRate` are deprecated: no
agent reads `scrapeInterval` or `samplingRate`, so every Monitoring and Tracing offer
refuses a Live System that sets them instead of letting the platform drop them.

| Component | Offer |
|---|---|
| `Monitoring` | `Prometheus` · `KubePrometheusStack` · `SqsExporter` |
| `Tracing` | `Jaeger` · `GrafanaTempo` |
| `Logging` | `ObservabilityElastic` · `GrafanaLoki` · `GrafanaAlloy` |

#### The caas-k8s Grafana stack

Installed by the caas-k8s agent with Helm; namespace default `monitoring`. No
CloudWatch anywhere: Grafana has no CloudWatch datasource. The retention is the
component's neutral `withRetentionDays` (sent as `retentionDays`), not an offer key.

| Offer | Keys (agent defaults) | Links and dependencies |
|---|---|---|
| `KubePrometheusStack` (`Observability.CaaS.KubePrometheusStack`) | `namespace`, `storageClassName` (see below), `prometheusStorageGi` (`50`), `lokiUrl` / `tempoUrl` (the Loki / Tempo service in the namespace; `none` = no datasource), `alertRules`, `alertmanagerConfig`, `values`; `retentionDays` `15` | optional route link to a `TraefikGateway` for Grafana (below) |
| `GrafanaLoki` (`Observability.CaaS.GrafanaLoki`) | `namespace`, `storageClassName` (see below), `values`; `retentionDays` `14` | exactly one link to an `AwsS3` bucket with `{access: 'read-write'}` |
| `GrafanaTempo` (`Observability.CaaS.GrafanaTempo`) | as Loki; `retentionDays` `7` | as Loki |
| `GrafanaAlloy` (`Observability.CaaS.GrafanaAlloy`) | `namespace`, `lokiPushUrl` (none = the `pushUrl` of the Loki it depends on), `values` | a dependency on a `GrafanaLoki` component, unless `lokiPushUrl` is set |

Without `storageClassName`, `KubePrometheusStack`, `GrafanaLoki` and `GrafanaTempo`
on EKS use `fractal-gp3`, which the agent creates when absent (encrypted gp3, EKS
Auto Mode's EBS CSI driver, `WaitForFirstConsumer`), provided that CSI driver
exists; otherwise their volumes are ephemeral, so set `storageClassName` on EKS
without Auto Mode. The class chosen is published as the `storageClassName` output
and kept: a release installed before that output stays ephemeral.

Grafana can be routed through a `TraefikGateway` with the workload route link:

```ts
bp.link(prometheus, gateway, gatewayRouteSettings({routes: [{prefix: '/grafana/'}]}));
```

The agent routes to `kps-grafana:80` and strips the sub-path, which must end with
`/` (a `rewritePath` is refused); the route goes through ForwardAuth unless the
gateway's `forwardAuthExemptComponentIds` lists the stack. `KubePrometheusStack`
then publishes `gatewayRoutes`.

#### `SqsExporter` (`Observability.CaaS.SqsExporter`)

A Prometheus exporter of SQS queue depth (EKS only), scraped by
`KubePrometheusStack` through a ServiceMonitor. Link it (no settings) to every
`AwsSqsQueue` it watches, references to other Live Systems' queues included: it
watches the queue and, once published, its dead-letter queue. Its Pod Identity role
may only `sqs:GetQueueAttributes` on those exact queues.

| Key | Type | Default |
|---|---|---|
| `namespace` | string | `monitoring` |
| `queueUrls` | string[] | none: queues watched besides the linked ones (`https://sqs.<region>.amazonaws.com/<account>/<name>`) |
| `monitorIntervalSeconds` | number | `30` |
| `image` | string | unset: the agent's own multi-arch (amd64 and arm64) release image |
| `imagePullSecrets` | string[] | none: Secrets in the namespace to pull the image with |
| `nodeSelector` | `Record<string, string>` (non-empty) | none |

The agent's own image is private on Docker Hub: give the namespace a pull secret
(`imagePullSecrets`) or set `image` to a mirror. The SDK sends no `image` or
`nodeSelector` unless you set them, so the agent's default always applies.

An exporter with no linked queue and no `queueUrls` is refused. Metrics:
`sqs_approximatenumberofmessages`, `…_delayed`, `…_notvisible`, label `queue`;
alert on dead letters with `KubePrometheusStack({alertRules})`.

#### Pod Identity role outputs

`K8sWorkload`, `CertManager`, `GrafanaLoki`, `GrafanaTempo` and `SqsExporter`
publish, besides `podIdentityRoleArn` / `podIdentityAssociationId`, the output fields
`workloadRoleName`, `workloadRoleArn` and `workloadRoleDrift` (`{"corrected": [...],
"at": "<RFC 3339>"}`, the last trust-policy or permissions-boundary correction). Read
them from `liveSystems.state(...)` like any other output field.

### Security

| Component | AWS | Self-hosted |
|---|---|---|
| `ServiceMesh` | — | `Ocelot` |
| `IdentityProvider` | `Cognito` | `Keycloak` |
| `CertificateManager` | — | `CertManager` |

#### `CertManager` (`Security.CaaS.CertManager`, caas-k8s agent)

cert-manager v1.21.2 (pinned by the agent, not a parameter) on EKS, with a Let's
Encrypt ClusterIssuer that solves DNS-01 in Route 53 by assuming a zone role. A
`TraefikGateway` names its issuer in `tlsClusterIssuer`.

| Key | Type | Default |
|---|---|---|
| `hostedZoneId` | string | required: Route 53 zone id (`Z...`) |
| `role` | string | required: zone role ARN (`arn:aws:iam::<account>:role/...`) |
| `email` | string | required: ACME account email |
| `acmeServer` | `'production' \| 'staging' \| 'https://...'` | `production` |
| `clusterIssuerName` | string | `letsencrypt` |
| `namespace` | string | `cert-manager` |

```ts
CertManager({
  hostedZoneId: 'Z0123456789ABCDEFGHIJ',
  role: 'arn:aws:iam::111122223333:role/fractal-acme-dns01',
  email: 'platform@example.com',
});
```

Output fields: `namespace`, `releaseName`, `chartVersion`, `clusterIssuerName`,
`acmeServer` (the directory URL), `hostedZoneId`, `role`, `serviceAccountName`,
`podIdentityRoleArn`, `podIdentityAssociationId`, plus the Pod Identity role outputs
listed under Observability.

### Unmanaged (external / SaaS)

A single generic `Unmanaged` component models a third-party service Fractal does not provision, satisfied by per-domain SaaS offers.

| Component | Offer |
|---|---|
| `Unmanaged` | `UnmanagedAi` (`AI.SaaS.Unmanaged`) |

Its `secret` references an environment secret by short name via `secretRef('...')` — the raw value never travels in the blueprint. `secretRef` works in **any** component parameter or link setting:

```typescript
import {UnmanagedAi, secretRef} from '@fractal_cloud/sdk';

select: {openai: UnmanagedAi({secret: secretRef('openai-api-key')})};
// serializes as { secret: { $envSecret: 'openai-api-key' } }; the agent
// resolves it from the environment secret store at reconciliation time.
```

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
  secret.ts        # secretRef: env-secret references for params + link settings
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
    unmanaged.ts             # Unmanaged (external / SaaS)
  offers/          # Concrete Offers (Level 3) declaring what Component they satisfy
    <domain>.ts    # one file per domain, mirroring components/ (incl. unmanaged.ts)
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
