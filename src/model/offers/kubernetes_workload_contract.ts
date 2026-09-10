/**
 * kubernetes_workload_contract.ts — the parameter names the caas-k8s agent
 * publishes for `CustomWorkloads.CaaS.KubernetesWorkload`.
 *
 * WHY THIS FILE EXISTS. Nothing in this repository can see an offer's parameter
 * contract. Offers declare a type id, a provider and a delivery model; the names
 * of the parameters the claiming agent actually reads live in that agent's
 * source and are published by the platform catalogue at runtime. A component
 * parameter whose name is not in the contract is pruned before the agent sees
 * it, so a setter that emits the wrong name fails SILENTLY — the value is
 * accepted by the API, stored on the component, and read by nobody. That is how
 * `withImage` shipped writing `image` against a contract that only declares
 * `containerImage`, and how two tier-3 samples failed with
 * `containerImage is required when manifestUri is not set` while both the
 * sample and the agent were correct.
 *
 * A test can only catch that class of defect by comparing the emitted key
 * against the contract. With no machine-readable contract to import, this is a
 * TRANSCRIPTION, and its value is entirely in being kept honest:
 *
 *   source: Fractal-Cloud/aria-agent-caas-k8s
 *   symbol: K8sWorkloadHandler.CatalogEntry().Config
 *   file:   internal/reconciler/handlers/k8s_workload.go
 *   read:   2026-09-10
 *
 * Transcribing a contract is strictly worse than importing one. The real fix is
 * for the catalogue to publish these contracts in a form the SDK can consume at
 * build time, so a rename on either side breaks a build instead of a sweep;
 * until then this file is the seam where the two sides are compared at all.
 *
 * NOTHING HERE DETECTS DRIFT. When the agent renames or adds a parameter, this
 * file silently becomes wrong and every test in this repository stays green —
 * the failure resurfaces as a sweep, which is exactly the loop this file was
 * added to shorten. Re-read the source above whenever a workload parameter
 * misbehaves, and treat a green suite as no evidence that the transcription is
 * current.
 *
 * Note also that the premise "no machine-readable contract exists" is only true
 * on the SDK side. `fractal-cloud-agents` already publishes `ParamSpec`
 * contracts guarded by `AzureParamContractDriftTest` / `GcpParamContractDriftTest`,
 * and the Go agents publish `CatalogEntry().Config`. Two machine-readable
 * sources exist; what is missing is publication in a form npm can consume. The
 * durable fix is that publication, not a better transcription.
 *
 * NOTE — the handler also reads `manifestUri`, which its own `CatalogEntry` does
 * NOT declare. That is an agent-side contract gap, not an SDK one; it is
 * recorded in `KUBERNETES_WORKLOAD_UNDECLARED_PARAMS` so this file stays a
 * faithful record of the agent rather than a tidied-up version of it.
 */

/** Parameter names declared by the agent's published contract. */
export const KUBERNETES_WORKLOAD_CONTRACT_PARAMS = [
  'namespace',
  'containerImage',
  'containerPort',
  'cpu',
  'memory',
  'replicas',
  'env',
  'imagePullSecrets',
  'resourceRequests',
  'resourceLimits',
  'helmChart',
  'helmRepo',
  'helmVersion',
  'helmValues',
] as const;

/**
 * Parameters the handler reads but its `CatalogEntry` does not declare. Read by
 * the agent, absent from the contract the platform prunes against — so whether
 * one survives the trip is a property of the platform, not of this SDK.
 */
export const KUBERNETES_WORKLOAD_UNDECLARED_PARAMS = ['manifestUri'] as const;

/** The contract's name for a workload's container image. */
export const KUBERNETES_WORKLOAD_IMAGE_PARAM = 'containerImage';

/** The neutral `Workload` component's name for the same value. */
export const NEUTRAL_IMAGE_PARAM = 'image';

/** A value counts as supplied only if it is not nullish and not a blank string. */
const isSupplied = (v: unknown): boolean =>
  v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '');

/**
 * Translate a Workload's neutral `image` into the name the caas-k8s agent reads.
 *
 * Applied by EVERY offer that emits a `CustomWorkloads.CaaS.KubernetesWorkload`
 * component. There are two such paths and they are easy to mistake for one:
 *
 *   1. a top-level `Workload` with the `K8sWorkload` offer selected for it, and
 *   2. a `Workload` added as a CHILD of a ContainerPlatform (`Eks`/`Aks`/`Gke`),
 *      which is never offer-selected — `toLiveSystem` calls `instantiate` only
 *      for top-level components, so the platform offer emits the child itself.
 *
 * Path 2 is the one `app_with_identity` takes, and a first version of this fix
 * translated only path 1: correct code on a path no sample used. Both call
 * here now, which is the point of the function existing at all.
 *
 * `image` is dropped rather than emitted alongside: a name the contract does
 * not declare is pruned in flight, and leaving it on the component invites the
 * next reader to believe it does something.
 *
 * PRECEDENCE. An explicitly set `containerImage` wins over the neutral `image`
 * — blueprints that already worked around this bug by writing the contract name
 * by hand keep working and are never clobbered. But when the neutral `image` is
 * a LOCKED guardrail, an override is a contradiction rather than a preference:
 * the architect pinned the image at design time and `ensureUnlocked` would have
 * refused `set('image', …)`, so allowing `set('containerImage', …)` to win
 * silently would make the lock guard only the name nothing reads. That case
 * throws. A blank `containerImage` is treated as unsupplied, so it can neither
 * suppress a guardrail image nor ship an empty string the agent rejects.
 */
export const withContractImageName = (
  params: Record<string, unknown>,
  componentId: string,
  locked: readonly string[] = [],
): Record<string, unknown> => {
  const {[NEUTRAL_IMAGE_PARAM]: neutral, ...rest} = params;
  const explicit = rest[KUBERNETES_WORKLOAD_IMAGE_PARAM];
  if (isSupplied(explicit)) {
    if (locked.includes(NEUTRAL_IMAGE_PARAM)) {
      throw new Error(
        `Parameter '${NEUTRAL_IMAGE_PARAM}' on '${componentId}' is a locked ` +
          `guardrail, and '${KUBERNETES_WORKLOAD_IMAGE_PARAM}' is the same value ` +
          'under the name the Kubernetes workload contract declares. Setting it ' +
          'would override the locked image without the lock noticing. Remove the ' +
          `'${KUBERNETES_WORKLOAD_IMAGE_PARAM}' override, or drop the ` +
          "'.withImage()' guardrail if the image is meant to be dev-open.",
      );
    }
    return rest;
  }
  // Not supplied: fall back to the neutral value, and emit nothing at all when
  // there is none. An absent key makes the agent name the missing required
  // parameter; a blank one would have it reject an empty image instead.
  delete rest[KUBERNETES_WORKLOAD_IMAGE_PARAM];
  return isSupplied(neutral)
    ? {...rest, [KUBERNETES_WORKLOAD_IMAGE_PARAM]: neutral}
    : rest;
};
