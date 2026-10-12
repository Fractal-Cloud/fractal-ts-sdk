# Offer definitions generated from the agents' parameter contracts

**Status:** implemented · **Date:** 2026-10-12

An offer's parameters are defined in one place: the agent that reconciles it. The SDK does not
keep its own copy of an offer's keys, types, defaults or required-ness. It generates them from
the parameter contracts the agents publish, and every hand-written part of an offer names the
agent's keys through that generated code, so a key the agent renames or drops is a compile error
here instead of a value nobody reads.

Hand-written copies drifted: the SDK wrote `scheme` while the load balancer agents read
`lbScheme`, OCI `availabilityDomain` while the agent read `availabilityZone`, `publicSSHKey`
while OCI read `keyName`, and `HetznerServer` was a type no agent reconciled any more.

## 1. Where the contracts come from

Every agent describes its offers' parameters in code, and the shared format is aria-spec's
`ParamContractProjection` (`param-contract.json`): one document per agent release, one entry per
offer with its `params` (key, type, required, default, values, aliases, ...) and, from contract
schema 2.0, its `parameterRules`. See fractal-cloud-agents `docs/param-contract.md` and
`docs/offer-parameter-contracts.md` section 2.

| Agent | Contract | How it is published today |
|---|---|---|
| fractal-cloud-agents (AWS, Azure, GCP, OCI) | schema **2.0** projection, generated from `ParamSpec` (`./gradlew :fractal.cloudagent.<p>.container:generateParamContract`) | Only a v1-shaped projection, attached as an OCI referrer to the image digest. The 2.0 projection is built into the jar but not attached to the GitHub release (see section 7). |
| aria-agent-caas-k8s, aria-agent-aruba | schema **1.0** projection (`export-contract`, go-common `paramcontract.Build`) | `param-contract.json` asset on every GitHub release |
| aria-agent-hetzner | 1.0, `export-contract` exists | No release has ever been cut, so nothing is published |
| aria-agent-openshift, aria-agent-vmware, aria-agent-terraform | — | No contract is published |
| ARIA catalog read API | the agents' `CatalogOffer` declarations | ARIA `main` stores only `type`, `default`, `description`, `required`; the 2.0 members are fractal-aria PR #97 ("Hold the full offer parameter contract 2.0 in ARIA"), not merged |

### Choice: a committed snapshot of the projections, pinned per agent release

The SDK build reads `contracts/snapshot/<agentId>.json`, committed, and `contracts/sources.json`
pins each to a repository and release tag with the snapshot's SHA-256. Nothing is fetched at
build, test or install time.

- **Pinned and reproducible.** A contract is identified by the agent release it came from
  (`agentVersion` is the tag); the digest catches a hand edit.
- **Offline.** Consumers install a package with the generated code; CI and contributors never
  need agent credentials to build or test.
- **The richest source available.** The 2.0 projection carries types, values, aliases,
  constraints and rules. ARIA's read API is the design's eventual source (agents
  `docs/offer-parameter-contracts.md` 6.4), but today it drops everything except `required`,
  `type` and `default`, and it reflects environment state rather than an agent release. The v1
  OCI referrer is a v1 shape on purpose (Evergreen) and needs registry credentials.
- **One format for both families.** Java (2.0) and Go (1.0) projections share the envelope; the
  generator reads both.

When ARIA serves the full 2.0 contract (fractal-aria #97 and the agents' wave-2 declarations), the
refresh script can take the platform-organization catalog instead; the snapshot format and
everything downstream stay the same.

### Refreshing

```bash
# Needs: gh with read access to the agent repositories (GH_TOKEN), and a JDK 21 for the Java agents.
node scripts/refresh-offer-contracts.mjs            # re-fetch the pinned tags (reproduce the snapshot)
node scripts/refresh-offer-contracts.mjs --latest   # move every pin to the agent's latest release
npm run contracts:generate                           # regenerate src/model/offers/generated/
UPDATE_UNDECLARED_PARAMETERS=1 npx vitest run src/model/offer_contracts.test.ts   # if the inventory moved
npm test
```

Go agents are fetched with `gh release download <tag> --pattern param-contract.json`. The Java
agents publish no downloadable 2.0 projection, so the script clones the release tag and runs the
agents' own `generateParamContract` with `RELEASE_VERSION=<tag>`, exactly as their release
pipeline does. Every document is stored in canonical form (object keys sorted), which also
neutralizes a producer that serializes a map in nondeterministic order (section 7).

### Staleness check

`.github/workflows/offer-contracts.yml` runs `npm run contracts:check` (`--latest --check`) daily
and on demand: it fails, listing the agents, when a newer agent release publishes a contract that
differs from the snapshot. It needs the `AGENT_CONTRACTS_TOKEN` secret (read access to the private
agent repositories) and fails explicitly when it is missing. It is deliberately not part of the PR
gate: the PR gate is offline, and a public fork has no access to the agents.

The PR gate (`npm test`) checks the other half: `src/model/offers/contract/generator.test.ts`
regenerates every module from the committed snapshot and requires the committed files to be
byte-identical, so generated code is never edited by hand and never lags the snapshot.

## 2. What is generated

`scripts/offer-contracts/generator.mjs` (pure) turns the projections into one module per
infrastructure domain under `src/model/offers/generated/`, each exporting one `as const` contract
per offer type, named after it (`NetworkAndCompute.IaaS.AwsLb` → `NetworkAndCompute_IaaS_AwsLb`):

```ts
export const NetworkAndCompute_IaaS_AwsLb = {
  offerType: 'NetworkAndCompute.IaaS.AwsLb',
  serviceTypes: ['NetworkAndCompute.IaaS.LoadBalancer'],
  declaredBy: [{agentId: 'fractal-cloud-agent-aws', agentVersion: 'v8.25.1',
                contractSchemaVersion: '2.0', provider: 'AWS', parameterRules: []}],
  params: {
    lbScheme: {type: 'string', required: false, default: ''},
    lbType: {type: 'string', required: false, default: 'application'},
    region: {type: 'string', required: false},
  },
} as const satisfies OfferContract;
```

- **Offer type ids, service types, parameter keys, types, required, defaults, values, aliases,
  deprecations, constraints and rules** come from the contract. A parameter `description` becomes
  the key's doc comment.
- **An offer several agents declare** (the self-hosted CaaS offers, which every Java agent and
  aria-agent-caas-k8s implement) is merged into one contract, because the SDK emits one component
  and any of those agents may reconcile it: keys are the union, a key is required if any agent
  requires it, `integer` and `number` meet at `number`, closed vocabularies intersect, differing
  defaults are dropped, and `agents` records which agents read a key when not all do. Any other
  disagreement fails the generator with both agents named.
- Generated modules hold data only. Unused contracts are tree-shaken from the bundle.

Dependencies and links are **not** generated: the projection does not carry an offer's
`dependencies` (they live in the ARIA declaration and `offer-catalog.json`), and link settings are
declared at component level in the catalogue. In the SDK both are carried by the blueprint (see
"Live System Sub-Component Dependencies" in the platform contract), so nothing is lost today.

## 3. How generated and hand-written code fit together

| Generated (from the agent) | Hand-written (SDK ergonomics) |
|---|---|
| offer type id (`defineOffer({contract})` takes it from the contract) | which Component an offer satisfies, its provider and delivery model |
| config keys, their types, required-ness (`ContractConfig<typeof X>`) | neutral → vendor translations (`withScheme` → `lbScheme`, `withPublicSSHKey` → OCI `keyName`, Workload → caas-k8s keys) |
| the vendor keys a translation writes (`contractKey(X, 'lbScheme')`, `contractKeys(X).containerImage`) | sealed builders, `satisfy()`, live-system-only sub-component dependencies |
| | ergonomic re-typing of a contract key (`ContractConfig`'s `Overrides`: a list the offer joins into the agent's comma-separated string, a sub-shape the contract only types `object`, a stricter literal union) |
| | cross-component checks in `validate`, and pre-submit checks the contracts cannot express yet |

The rules that keep the hand-written side honest, all compile-time:

- `ContractConfig<C, Omitted, Overrides>` only admits contract keys: `Omitted` is constrained to
  `keyof C['params']`, and an `Overrides` key that is not a contract key is mapped to `never`. A
  config with no keys left is `Record<string, never>` (TypeScript accepts anything for `{}`).
- `Omitted` holds the contract keys a neutral guardrail fills (`lbScheme`, `cidrBlock`,
  `ingressRules`, ...): offering them as config as well would let a config value bypass a locked
  guardrail.
- `contractKey` / `contractKeys` are typed to the contract's keys and also throw if the data lacks
  one.
- `src/model/offers/contract/contract_config.test-d.ts` pins the former drifts as type errors.

And two tests:

- `src/model/offer_contracts.test.ts` lists every offer of the catalogue: each one whose agent
  publishes a contract must be defined from it; the ones whose agent does not are an explicit
  list, each with the producer-side reason. It instantiates every offer with **every** neutral
  setter of its component and checks the emitted parameters against the contract of each emitted
  type. Keys the contract does not declare are pinned in `contracts/undeclared-parameters.json`;
  a new one fails the test until it is translated to a contract key or knowingly added. That
  inventory (220 keys over 65 offers at v8.25.1 / v1.4.0 / v0.0.20) is the to-do list of neutral
  guardrails no agent reads yet, and of translations the SDK lacks (e.g. `VirtualMachine.withSize`
  reaches no VM agent as `instanceType` / `vmSize` / `machineType`).
- `src/model/offers/contract/generator.test.ts` runs the generator on a fixture pair of contracts
  (a 2.0 Java and a 1.0 Go projection co-declaring an offer) and checks the committed generated
  sources against the committed snapshot.

What remains hand-written and why:

- **Offers whose agent publishes no contract**: Hetzner (no release), OpenShift, vSphere (no
  contract in their releases), `Keycloak` (no agent declares `Security.CaaS.Keycloak`). They keep
  their hand-written keys until their agent publishes; the conformance test then requires the move.
- **Pre-submit checks** (`validate`, `caas_param_checks.ts`, the Traefik / CloudFront / RDS
  checks). The contracts carry almost no rules, enums or constraints yet (12 `values`, 6
  `constraints`, rules on the Databricks jobs only), and the shared evaluator
  `@fractal-cloud/offer-contracts` is published only to private GitHub Packages, which a public npm
  package cannot depend on. When both change, these checks move to the contract evaluator.
- **Stricter-than-contract requirements**, kept as `Overrides` with their reason, e.g.
  `AzureContainerAppsEnvironment.location` (the agent passes it to ARM unguarded but declares it
  optional with default `""`), `Ec2Instance.instanceType`, `AzureVm.vmSize`.

## 4. Breaking-change policy for SDK consumers

Offer config types follow the contracts, so refreshing the snapshot can change the public types.

| Contract change | SDK effect | Release |
|---|---|---|
| key added, optional | new optional config key | minor |
| key becomes optional, vocabulary widens | config loosens | minor |
| key removed or renamed **with** a declared alias | the alias stays readable by the agent; the SDK offers the canonical key | minor, noted |
| key removed or renamed without an alias, becomes required, type or vocabulary narrows | consumer code stops compiling | listed under **Breaking** in the CHANGELOG, with the agent release that caused it |

A break is never papered over with an SDK-side alias: the SDK cannot invent a key the agent does
not read. A rename should be declared by the agent as an `aliases` entry, which keeps old
components working on the agent side. The version number of a release is the release owner's
choice; the CHANGELOG states the break once.

## 5. Breaking changes in this change

Keys removed from offer configs — none of them was read by any agent, so a value set there never
took effect:

- `AzureNsg`, `AzureServiceBus`, `AzurePostgresDbms`, `AzureDatalake`: `resourceGroup`.
- `AzureApiManagement`: `sku` (the agent reads `skuName`; `publisherEmail` is now optional, as
  declared).
- `EcsService`: `launchType`.
- `OciVcn`, `OciSubnet`, `OciSecurityList`, `OciInstance`: `region` (the OCI agent reads no
  per-component region); `OciSecurityList`: `compartmentId`; `OciSubnet`: `availabilityDomain`,
  now the contract key `availabilityZone`.
- `GcpPostgresDbms`: `tier`. `ArubaMySqlDbms`: `region`.
- `TraefikGateway`: `forwardAuthExcludedPrefixes` (already refused at runtime).

Keys the contracts require, now required in the config (each failed at reconcile before):
`nodeTypeId` on the Databricks clusters, `sparkOperatorName` on `CaaSSparkCluster` /
`CaaSSparkJob` and `mainApplicationFile` on `CaaSSparkJob`, `apiConfig` on `GcpApiGateway`,
`clusterName` on `KafkaTopic`, `elasticInstances` and `storage` on `ObservabilityElastic`, `host`
on `Ocelot`, `entryPoints` on `Traefik`.

Every other contract key of an offer is now an optional config key (e.g. `AwsLb.lbType`,
`AzureBlob`'s storage-account settings).

## 6. Layout

```
contracts/sources.json                  pins: agent, repository, tag, fetch method, snapshot digest
contracts/snapshot/<agentId>.json       canonical published projections
contracts/undeclared-parameters.json    inventory of emitted keys the contracts do not declare
scripts/offer-contracts/generator.mjs   projections -> modules (pure)
scripts/offer-contracts/snapshot.mjs    read + verify the snapshot
scripts/generate-offer-contracts.mjs    npm run contracts:generate
scripts/refresh-offer-contracts.mjs     npm run contracts:refresh / contracts:check
src/model/offers/generated/*.ts         generated contracts (do not edit)
src/model/offers/contract/*.ts          OfferContract, ContractConfig, contractKey, ...
```

## 7. Producer gaps found (to be fixed in the producing repositories)

1. **fractal-cloud-agents: the 2.0 projection is not published.** `release.yml` attaches only
   `param-contract.v1.json` as an OCI referrer; agents `docs/offer-parameter-contracts.md` 3.5 says
   the 2.0 `param-contract.json` is "uploaded as a release asset", and v8.25.1 has no assets. Until
   it is, the SDK refresh builds the projection from the tag. Fix: upload
   `fractal.cloudagent.<p>.container/build/param-contract/param-contract.json` (per provider, e.g.
   `param-contract-aws.json`) to the GitHub release.
2. **fractal-cloud-agents: the Azure projection is not deterministic.** The `default` of
   `Messaging.PaaS.EventHubInstance.retention` is serialized from an unordered map, so two builds
   of one tag order `timeInHours` / `tombstoneTimeInHours` differently. The snapshot canonicalizes;
   the projector should sort map defaults.
3. **aria-agent-hetzner: never released**, so its `param-contract.json` release asset does not
   exist, although `release.yml` has the `export-contract` step.
4. **aria-agent-openshift, aria-agent-vmware, aria-agent-terraform: no contract published**
   (agents design A.8: no `export-contract` / `register`).
5. **ARIA read API drops the 2.0 members** until fractal-aria #97 merges.
6. **`@fractal-cloud/offer-contracts` is private** (GitHub Packages, `UNLICENSED`), so the public
   SDK cannot evaluate rules with it.
7. **Contract content gaps** the generated types now make visible (each is the agent's to fix):
   aria-agent-caas-k8s 1.0 types its comma-separated lists (`tlsHosts`, `queueUrls`, ...) as
   `string` and declares no `values`; `AI.SaaS.Unmanaged.secret` is not `sensitive`;
   `CustomWorkloads.PaaS.AwsEcsService` declares only `region`; `lbScheme` has no `values` on any
   provider; `AzureContainerAppsEnvironment.location` is optional with default `""` although the
   agent cannot work without it, and its `resourceGroup` is declared and read into the config but
   never used by the component (the SDK withholds it). And `contracts/undeclared-parameters.json` lists every neutral
   guardrail no agent reads.
