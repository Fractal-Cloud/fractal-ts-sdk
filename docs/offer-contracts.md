# Offer definitions generated from the agents' published contracts

An offer's parameters are defined in one place: the agent that reconciles it. The SDK does not keep
its own copy of an offer's keys, types or required-ness. It generates them from the parameter
contracts the agents publish, and every hand-written part of an offer names the agent's keys
through that generated code, so a key the agent renames or drops is a compile error here instead of
a value nobody reads.

**Value constraints come from the agents' published contracts; the SDK does not hand-check
single parameter values; structural rules stay.** Every parameter an offer emits for its own
offer type is checked against that contract while the Live System is built (section 3.2), and
the control plane checks the whole Live System again before deploy (section 4). The SDK keeps no
per-offer copy of an agent's value rules: a value constraint the SDK should enforce is added to
the agent's contract, and reaches the SDK when the snapshot is refreshed.

## 1. Where the contracts come from

Each agent release attaches its parameter contract (`param-contract.json`, one document per agent
release) to its GitHub release: one entry per offer with its parameters (key, type, required,
default, allowed values, aliases, constraints) and, from contract schema 2.0, its cross-parameter
rules.

The SDK build reads a committed snapshot of those documents, `contracts/snapshot/<agentId>.json`.
`contracts/sources.json` pins each to an agent repository, a release tag and the snapshot's
SHA-256. Nothing is fetched when the SDK is built, tested or installed.

- **Pinned and reproducible.** A contract is identified by the agent release it came from; the
  digest catches a hand edit.
- **Offline.** Consumers install a package with the generated code, and contributors build and test
  without access to the agent repositories.
- **Canonical.** Every document is stored with its object keys sorted, so the digest does not
  depend on how a producer orders a map.

Offers whose agent publishes no contract (Hetzner, vSphere, `Keycloak`) stay
hand-written until it does; the conformance test (section 3) then requires the move.

### How a new contract arrives: one pull request per agent release

The agents push their contracts here; this repository never reads theirs. The release workflow of
each agent repository that publishes a contract (`fractal-cloud-agents`, `aria-agent-caas-k8s`,
`aria-agent-openshift`) ends with a job, `push-contract-to-sdk`, that:

1. checks this repository out with the agent repository's `GH_PAT`;
2. runs `scripts/import-agent-contract.mjs` on the `param-contract.json` it has just released (for
   `fractal-cloud-agents`, once per cloud agent);
3. opens a pull request, **`<agent repository> <tag> contract`**, from a branch of its own,
   `contracts/<agent repository>/<tag>`, whose body links the agent release and lists, per offer,
   the keys added, removed and changed, with the changes that may break consumers first;
4. closes the open pull requests of that agent's earlier releases, with a comment naming the new
   one. Their branches are kept, so a fix pushed to one can be picked onto the new one.

It opens nothing when the release publishes the contract the snapshot already holds (only its
`agentVersion` differs), or when the release is older than the pinned one. Pre-releases push
nothing. A failure of that job is an error annotation on the agent's release run; it never fails
or rolls the release back. Each import is a separate pull request, so the PR gate checks it like any
other change: `src/model/offers/contract/generator.test.ts` regenerates every module from the
committed snapshot and requires the committed files to be byte-identical, and the conformance tests
(section 3) name every neutral parameter that needs a rule and every rule that went stale.

### Reviewing a contract pull request

- **Nothing listed under "Possibly breaking"**: the change loosens or extends the contract
  (section 5). Check the generated diff reads as the summary says, add a line to the CHANGELOG
  (minor), and merge.
- **Something listed under "Possibly breaking"** (an offer or key removed without an alias, a key
  that became required, a type change, allowed values dropped): the pull request usually fails the
  PR gate, because offers built on the old keys stop compiling. Push the SDK changes it needs to the
  pull request's branch (a translation becomes a refusal, a renamed key's setter follows it, ...),
  list the change under **Breaking** in the CHANGELOG with the agent release, and release the SDK
  accordingly. When a key was removed by mistake, fix the agent and release it instead: its pull
  request then supersedes this one.
- No test spells out an agent's tag or digest: a test about a contract reads the pin from
  `contracts/sources.json` and asserts facts about the contract itself (its keys, its offers, the
  release they appeared in at the earliest), so an import that keeps those facts passes, and one
  that breaks them fails, naming the fact. Keep it that way when adding such a test.
- A later release of the same agent closes the pull request; carry any fix pushed to it over to
  the new one.

### Importing by hand

```bash
# Offline: from a param-contract.json you already have (e.g. downloaded from the agent release).
node scripts/import-agent-contract.mjs aria-agent-caas-k8s v2.1.0 ./param-contract.json
# An agent the sources do not list yet also needs its repository and release asset:
node scripts/import-agent-contract.mjs aria-agent-x v0.1.0 ./param-contract.json \
  --repository Fractal-Cloud/aria-agent-x --asset param-contract.json
npm test   # names every neutral parameter that needs a rule, and every rule that went stale
```

The import validates that the document is that agent's contract at that tag, writes the canonical
snapshot, moves the pin in `contracts/sources.json` (repository, tag, asset, digest) and
regenerates `src/model/offers/generated/`; the whole model is generated, and so validated, before
the first file is written. It prints the change summary (Markdown, names only) on standard output,
and nothing when the contract did not change. A tag older than the pinned one imports nothing unless
`--allow-downgrade`.

To fetch and import in one go, with the GitHub CLI and read access to the agent repositories
(`GH_TOKEN`):

```bash
node scripts/refresh-offer-contracts.mjs            # re-fetch the pinned releases
node scripts/refresh-offer-contracts.mjs --latest   # move every pin to the agent's latest release
node scripts/refresh-offer-contracts.mjs --latest --check   # write nothing; exit 1 when behind
```

The refresh never echoes the output of the tools it runs (the agent repositories are not public,
and CI logs of this repository are): a failure names the step and its exit code only.

## 2. What is generated

`scripts/offer-contracts/generator.mjs` (pure) turns the snapshot into one module per
infrastructure domain under `src/model/offers/generated/`, each exporting one `as const` contract
per offer type, named after it (`NetworkAndCompute.IaaS.AwsLb` → `NetworkAndCompute_IaaS_AwsLb`).

- Offer type ids, service types, parameter keys, types, required-ness, defaults, allowed values,
  aliases, deprecations, constraints and rules come from the contract. A parameter's description
  becomes its doc comment.
- **An offer several agents declare** (the self-hosted CaaS offers) is merged into one contract,
  because the SDK emits one component and any of those agents may reconcile it: a key is required if
  any agent requires it, `integer` and `number` meet at `number`, allowed values intersect (and only
  warn or fold case when every agent declaring them says so), a key is `sensitive` if any agent marks
  it, differing defaults and `derived` notes are dropped, an alias is kept only when every agent reads
  it, and `agents` records which agents read a key when not all do. Any other disagreement (two
  different `constraints` included) fails the generator, naming both agents.
- **One contract per provider when providers disagree on a required key.** An IaaS, PaaS or FaaS
  offer is emitted with its provider, and ARIA keys a catalog offer by offer type and provider.
  When agents of different providers declare one such offer type, and one of them requires a key
  that another provider's agent does not require (or does not declare), a merged contract would
  require that key of every provider's offer. The generator then emits one contract per provider,
  `<Offer_Type>_<Provider>` (`NetworkAndCompute_PaaS_Kubernetes_WIIT`), and no merged contract.
  **The trigger is required-ness only.** The other differences a merge reconciles (allowed values,
  defaults, aliases, ...) merge as above. Agents of one provider are always merged, and so are CaaS
  and SaaS offers, which the SDK emits without a provider. A refresh that introduces such a
  disagreement removes the merged contract, so an offer built on it stops compiling until it names
  its provider's contract.
- **A key named for a secret value** (`...Password`, `...Secret`, `...Token`, `...ApiKey`,
  `...ConnectionString`, ...; not a secret's name or id) is generated `sensitive` even when its agent
  leaves it unmarked, so it takes a `secretRef(...)` and a refusal never shows it.
- **A key an agent declares twice** (its canonical key and an older spelling it still reads,
  each as its own parameter instead of one with an alias) is folded into the canonical key as a
  deprecated alias, as listed in `contracts/key-aliases.json`. An entry the agent data no longer
  needs fails the generator: remove it once the agent declares the alias itself.
- **Merging never widens an offer.** An optional key only some of the declaring agents read is not
  a config key (`ContractParameters`), and a neutral translation into one is refused, naming the
  agents. A key some agent requires stays, since that agent cannot work without it.
- **`canAccessSecrets`.** An offer every declaring agent publishes with `canAccessSecrets: true`
  is generated with `canAccessSecrets: true`; otherwise the member is absent. The flag and the
  `environmentSecretShortNames` parameter (type `array`) go together, as ARIA requires: an agent
  that publishes one without the other fails the generator. A flagged offer's config carries the
  key, and its constructor's result has `withEnvironmentSecrets(shortNames)`, which sets it; no
  other offer has either, so selecting secrets for it does not compile. (Exception:
  `KubePrometheusStack` keeps a deprecated `withEnvironmentSecrets` that always throws, because
  caas-k8s v2.0.0 dropped the flag that v1.x published.)
- **An offer no agent declares any more** keeps compiling while it is deprecated: it becomes
  contract-less, its config type read from the agent's last contract frozen under
  `src/model/offers/retired/` (`Traefik`, `Prometheus`, `Jaeger`, `Ocelot`), and it is listed in
  `UNPUBLISHED` in `offer_contracts.test.ts`. Delete the frozen file with the offer.
- Generated modules hold data only; unused contracts are tree-shaken from the bundle.

Dependencies and links are not generated: in the SDK they are carried by the blueprint.

## 3. How generated and hand-written code fit together

| Generated (from the agent) | Hand-written (SDK ergonomics) |
|---|---|
| offer type id (`defineOffer({contract})`) | which Component an offer satisfies, its provider and delivery model |
| config keys, their types, required-ness (`ContractConfig<typeof X>`) | neutral → vendor translations and refusals, as each offer's `neutral` rules (3.1) |
| the vendor keys a translation writes (`contractKey`, `contractKeys`, `toContractKey`) | live-system-only sub-components (e.g. the ECS task definition `<id>-task`) |
| | re-typing a contract key for ergonomics (`ContractConfig`'s `Overrides`) |
| value constraints of every emitted parameter (`contractConfigProblem`, run by `defineOffer`) | structural rules: several components (a Container App's environment, a CloudFront origin, a load balancer's subnets) or several parameters of one (keys that exclude or require each other), the encoding of a value, and guardrails an offer cannot honor |

What keeps the hand-written side honest, at compile time:

- `ContractConfig<C, Omitted, Overrides>` only admits contract keys; a config with no keys left is
  `Record<string, never>`. `Omitted` holds the contract keys a neutral setter fills (`lbScheme`,
  `cidrBlock`, `ingressRules`, ...), so a config value cannot bypass a locked guardrail.
- `contractKey` / `contractKeys` / `toContractKey` are typed to the contract's keys.
- `src/model/offers/contract/contract_config.test-d.ts` pins former drifts as type errors.

And at test time, `src/model/offer_contracts.test.ts`: every offer whose agent publishes a contract
is defined from it; every offer is instantiated with every neutral setter of its component and the
emitted parameters are checked against the contract of each emitted type (keys a contract does not
declare are allowed only through `contracts/undeclared-parameters.json`, each with a reason; it is
empty); every refusal refuses; no rule exists for a key the contract now declares.

### 3.1 Neutral parameters: translated or refused, never sent unread

A component's neutral setters are chosen before any offer is, so whether one reaches an agent
depends on the offer selected. Each offer gives every neutral parameter its contract does not
declare a rule (`neutral` in `defineOffer`, helpers in `offers/neutral_rules.ts`), applied when the
Live System is built:

- `toContractKey(contract, key, map?)` / `toContractKeys(...)`: the value becomes the contract key
  the agent reads (`size` → `instanceType` / `vmSize` / `machineType` / `shape`, `retentionDays` →
  S3 `lifecycleExpirationDays`, `engineVersion` → RDS `version`, ...), converted to the agent's
  unit (`VmSize` mapped per vendor in `offers/vm_sizes.ts`; Kubernetes quantities in
  `offers/resource_quantities.ts`). A value the translation cannot produce is refused. An explicit
  vendor value wins over an open neutral one, and is refused against a locked one.
- `unsupported(reason)`: no key of the agent's contract can honor it, so `toLiveSystem` refuses the
  Live System, naming the offer, the parameter, the component and the reason.
- `unsupportedUnless(satisfiedBy, reason)`: refused unless the offer already does what the value
  asks (encryption at rest on S3, a private bucket); a satisfied value is not sent.

### 3.2 Values: checked against the contract, never by hand

`defineOffer` checks every parameter a selected offer emits for its own offer type against that
offer's contract, after its neutral rules and before its own `validate`: the type, the closed
vocabulary (`values`, compared case-insensitively when `valuesCaseInsensitive`, not refused when
`valuesLevel: warn`) and the constraints (`pattern`, `minLength` / `maxLength`, `minimum` /
`maximum`, not refused at `level: warn`), with the value shown only as the redaction rules of
`contract_value_problem.ts` allow. An environment-secret reference is accepted for any key, and a
key the contract does not declare is left to the `undeclared-parameters.json` check. Required keys
are the config type's (`ContractConfig`) and the control plane's, which may supply one itself
(IPAM fills a subnet's `cidrBlock`).

An offer's own `validate` holds only structural rules: what involves other components, keys of
one component that exclude or require each other, how the SDK encodes a value, and a guardrail it
cannot honor. A rule on one parameter's value belongs in the agent's contract.

## 4. Validation before deploy

`cloud.liveSystems.deploy` asks the control plane (`POST /livesystems/validate`, or
`/livesystems/{id}/validate` for an update) what deploying the Live System would answer about its
parameters, before submitting anything. The answer is a `ParameterValidationResult`: issues grouped
per component and parameter, each with a severity, a message and a fix.

- A blocking issue refuses the deploy with a `LiveSystemValidationError` carrying the result; in
  `wait` mode one `ERROR Live System validation failed  system=… errors=… warnings=…` line is
  logged.
- Warnings are logged in `wait` mode, one line each, and the deploy continues.
- A control plane without validation answers 404; the deploy then continues with a warning line.
- `cloud.liveSystems.validate(ls)` returns the result without deploying; `skipValidation: true`
  drops the early check (the control plane still checks the create or update).

`toLiveSystem()` stays offline: it only builds the Live System.

## 5. Breaking-change policy for SDK consumers

Offer config types follow the contracts, so refreshing the snapshot can change the public types.

| Contract change | SDK effect | Release |
|---|---|---|
| key added, optional | new optional config key | minor |
| key becomes optional, allowed values widen | config loosens | minor |
| key removed or renamed with a declared alias | the agent still reads the alias; the SDK offers the canonical key | minor, noted |
| key removed or renamed without an alias, becomes required, type or allowed values narrow | consumer code stops compiling | listed under **Breaking** in the CHANGELOG, with the agent release |
| an agent starts reading a key the SDK refuses | the conformance test flags the stale refusal; it becomes a translation | minor |
| an agent stops reading a key a translation writes | the translation stops compiling; it becomes a refusal | listed under **Breaking** |

The SDK never invents an alias the agent does not read.

## 6. Layout

```
contracts/sources.json                  pins: agent, repository, release tag, asset, snapshot digest
contracts/snapshot/<agentId>.json       canonical published contracts
contracts/undeclared-parameters.json    undeclared keys an offer may still send, each with a reason
scripts/offer-contracts/generator.mjs   contracts -> modules (pure)
scripts/offer-contracts/snapshot.mjs    read and verify the snapshot
scripts/offer-contracts/import.mjs      validate, summarize and write one agent's contract
scripts/import-agent-contract.mjs       import a local param-contract.json (agent releases run it)
scripts/generate-offer-contracts.mjs    npm run contracts:generate
scripts/refresh-offer-contracts.mjs     fetch, then import (npm run contracts:refresh / contracts:check)
src/model/offers/generated/*.ts         generated contracts (do not edit)
src/model/offers/contract/*.ts          OfferContract, ContractConfig, contractKey, ...
src/model/validation/*.ts               ParameterValidationResult, LiveSystemValidationError
```
