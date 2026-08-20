# Changelog

Notable changes to `@fractal_cloud/sdk`. This file starts at 2.4.5, the first
release that changed what gets deployed without saying so. It ships inside the npm
package (`files: ["dist", "CHANGELOG.md"]`) so an installer can read it without
visiting GitHub.

The version published for a release is the GitHub release tag: `release.yml` runs
`npm version <tag>` at publish time, so `package.json` on `main` is not the source
of truth for what is on npm.

## Unreleased

The version is the release tag's decision, not this file's — see *Choosing the
version* at the end of this entry.

### What you may need to change

**Nothing in your code.** No exported identifier was added, removed, renamed or
retyped. `K8sWorkload`, `MinIO`, `CaaSSparkCluster`, `CaaSSparkJob` and `CaaSMlflow`
are imported, called and typed exactly as before, and the published `.d.ts`
declarations are byte-identical to 2.5.0's. Nothing can fail to compile.

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

### Added

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

Not a semver-major: no exported identifier was removed, renamed or retyped. The
offer-type fix leaves the declarations byte-identical; the `dependsOn` additions
widen three exported node types, which is source-breaking for the three shapes listed
under *What you may need to change* — constructing such a node value, keying an
exhaustive mapped type off one, or duck-typing on `dependsOn`, that last one
compiling cleanly while changing behavior. No sample and no known consumer does any
of them.

Between patch and minor, this release now argues squarely for a **minor**: it adds
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
