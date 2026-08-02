# Changelog

Notable changes to `@fractal_cloud/sdk`. This file starts at 2.4.5, the first
release that changed what gets deployed without saying so. It ships inside the npm
package (`files: ["dist", "CHANGELOG.md"]`) so an installer can read it without
visiting GitHub.

The version published for a release is the GitHub release tag: `release.yml` runs
`npm version <tag>` at publish time, so `package.json` on `main` is not the source
of truth for what is on npm.

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
