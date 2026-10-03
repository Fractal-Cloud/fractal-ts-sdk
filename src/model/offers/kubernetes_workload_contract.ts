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
 *   read:   2026-09-10, extended 2026-10-03 with the Phase 5 workload contract
 *           (rollout, drain, disruption, autoscaling, probes, spread, secretEnv)
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

import {isSecretRef} from '../secret';

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
  // Added for the Domain Service fractal (Phase 5 contract §4): rollout, drain,
  // disruption, autoscaling, probes, spread, placement and secret env.
  'autoscaling',
  'podDisruptionBudget',
  'maxSurge',
  'maxUnavailable',
  'terminationGracePeriodSeconds',
  'preStopSleepSeconds',
  'readinessProbe',
  'livenessProbe',
  'startupProbe',
  'topologySpread',
  'nodeSelector',
  'secretEnv',
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
      // TODO: this throw breaks a blueprint that built before 2.7.2 — a locked
      // withImage() plus an explicit containerImage used to deploy, because the
      // contract pruned the neutral key (FRA-3248)
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

/** Is a parameter supplied on the component at all (see `isSupplied`)? */
const has = (params: Record<string, unknown>, key: string): boolean =>
  isSupplied(params[key]);

const lockedOverride = (
  componentId: string,
  neutral: string,
  contract: string,
): Error =>
  new Error(
    `Parameter '${neutral}' on '${componentId}' is a locked guardrail, and ` +
      `'${contract}' sets the same thing under the name the Kubernetes workload ` +
      'contract declares. Setting it would override the locked value without the ' +
      `lock noticing. Remove the '${contract}' override, or drop the guardrail if ` +
      'the value is meant to be dev-open.',
  );

/**
 * Move neutral values onto one canonical key. `sources` maps each neutral
 * parameter to the part of its value that belongs to `contract` (the caller has
 * already removed the neutral keys). An explicitly set canonical value wins,
 * unless a neutral value it would discard is a locked guardrail, which is
 * refused (the same rule as the image, see `withContractImageName`).
 */
const adopt = (
  params: Record<string, unknown>,
  componentId: string,
  locked: readonly string[],
  sources: Record<string, unknown>,
  contract: string,
  toContract: (neutral: Record<string, unknown>) => unknown,
): void => {
  const supplied = Object.keys(sources).filter(k => isSupplied(sources[k]));
  if (supplied.length === 0) {
    return;
  }
  if (has(params, contract)) {
    const lockedNeutral = supplied.find(k => locked.includes(k));
    if (lockedNeutral !== undefined) {
      throw lockedOverride(componentId, lockedNeutral, contract);
    }
    return;
  }
  const converted = toContract(sources);
  if (converted !== undefined) {
    params[contract] = converted;
  }
};

/** Remove neutral keys from the parameters, returning their values. */
const take = (
  params: Record<string, unknown>,
  ...keys: string[]
): Record<string, unknown> => {
  const taken: Record<string, unknown> = {};
  for (const k of keys) {
    taken[k] = params[k];
    delete params[k];
  }
  return taken;
};

/** Drop the keys whose value is undefined, and the object itself when empty. */
const compact = (
  value: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  const kept = Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  );
  return Object.keys(kept).length === 0 ? undefined : kept;
};

const asRecord = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};

const isWhole = (v: unknown, min: number, max = Number.MAX_SAFE_INTEGER) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

const refuse = (componentId: string, what: string): never => {
  throw new Error(`Kubernetes workload '${componentId}': ${what}.`);
};

const PROBES = ['readinessProbe', 'livenessProbe', 'startupProbe'] as const;

/**
 * A rolling-update pace as Kubernetes reads it: a whole count, or a whole
 * percentage up to 100%. Returns its size (0 for `0` and `0%`), or undefined
 * when it is neither.
 */
const rolloutAmount = (v: unknown): number | undefined => {
  if (isWhole(v, 0)) {
    return v as number;
  }
  const match = typeof v === 'string' ? /^(\d{1,3})%$/.exec(v) : null;
  if (match !== null && Number(match[1]) <= 100) {
    return Number(match[1]);
  }
  return undefined;
};

/**
 * An environment-secret reference placed in `env` would reach the container as
 * the reference's JSON, not the secret. Move it to `secretEnv`, which the agent
 * resolves from the environment's secret store; a name in both is refused.
 */
const moveSecretRefsToSecretEnv = (
  params: Record<string, unknown>,
  componentId: string,
): void => {
  const env = params['env'];
  if (env === undefined || Array.isArray(env)) {
    return;
  }
  const refs = Object.entries(asRecord(env)).filter(([, v]) => isSecretRef(v));
  if (refs.length === 0) {
    return;
  }
  const secretEnv: Record<string, unknown> = {...asRecord(params['secretEnv'])};
  for (const [name] of refs) {
    if (name in secretEnv) {
      refuse(
        componentId,
        `'${name}' on '${componentId}' is in both env and secretEnv`,
      );
    }
  }
  params['env'] = Object.fromEntries(
    Object.entries(asRecord(env)).filter(([, v]) => !isSecretRef(v)),
  );
  params['secretEnv'] = {...secretEnv, ...Object.fromEntries(refs)};
};

/** Refuse what the agent could only reject mid-deployment, or would apply wrongly. */
const ensureDeployable = (
  params: Record<string, unknown>,
  componentId: string,
): void => {
  const secretEnv = params['secretEnv'];
  if (secretEnv !== undefined) {
    for (const [name, value] of Object.entries(asRecord(secretEnv))) {
      if (!isSecretRef(value)) {
        // The value itself is never echoed: it is what must not be printed.
        refuse(
          componentId,
          `secretEnv '${name}' on '${componentId}' is not an environment-secret ` +
            "reference: pass secretRef('<shortName>'), never the secret itself",
        );
      }
    }
  }
  if (params['autoscaling'] !== undefined) {
    const a = asRecord(params['autoscaling']);
    if (!isWhole(a.maxReplicas, 1)) {
      refuse(componentId, 'autoscaling needs a maxReplicas of at least 1');
    }
    if (
      a.minReplicas !== undefined &&
      (!isWhole(a.minReplicas, 1) ||
        (a.minReplicas as number) > (a.maxReplicas as number))
    ) {
      refuse(
        componentId,
        'autoscaling minReplicas must be from 1 to maxReplicas',
      );
    }
    if (
      a.targetCpuUtilization !== undefined &&
      !isWhole(a.targetCpuUtilization, 1)
    ) {
      refuse(
        componentId,
        'autoscaling targetCpuUtilization must be a whole percentage of at least 1',
      );
    }
  }
  if (
    params['podDisruptionBudget'] !== undefined &&
    !isWhole(asRecord(params['podDisruptionBudget']).minAvailable, 0)
  ) {
    refuse(
      componentId,
      'podDisruptionBudget minAvailable must be a whole number of at least 0',
    );
  }
  for (const key of ['terminationGracePeriodSeconds', 'preStopSleepSeconds']) {
    if (params[key] !== undefined && !isWhole(params[key], 0)) {
      refuse(componentId, `${key} must be a whole number of at least 0`);
    }
  }
  for (const key of ['maxSurge', 'maxUnavailable']) {
    if (params[key] !== undefined && rolloutAmount(params[key]) === undefined) {
      refuse(
        componentId,
        `${key} must be a whole number of at least 0 or a percentage from 0% to 100%`,
      );
    }
  }
  if (
    rolloutAmount(params['maxSurge']) === 0 &&
    rolloutAmount(params['maxUnavailable']) === 0
  ) {
    refuse(
      componentId,
      'maxSurge and maxUnavailable cannot both be 0: the rollout could never progress',
    );
  }
  const grace = params['terminationGracePeriodSeconds'];
  const preStop = params['preStopSleepSeconds'];
  if (
    typeof grace === 'number' &&
    typeof preStop === 'number' &&
    preStop >= grace
  ) {
    refuse(
      componentId,
      `preStopSleepSeconds ${preStop} must be shorter than terminationGracePeriodSeconds ${grace}, or the stop signal never arrives`,
    );
  }
  for (const key of PROBES) {
    if (params[key] === undefined) {
      continue;
    }
    const probe = asRecord(params[key]);
    if (typeof probe.path !== 'string' || !probe.path.startsWith('/')) {
      refuse(componentId, `${key} needs a path starting with '/'`);
    }
    if (probe.port !== undefined && !isWhole(probe.port, 1, 65535)) {
      refuse(componentId, `${key} port must be from 1 to 65535`);
    }
    for (const n of [
      'initialDelaySeconds',
      'periodSeconds',
      'timeoutSeconds',
      'failureThreshold',
    ]) {
      if (probe[n] !== undefined && !isWhole(probe[n], 0)) {
        refuse(componentId, `${key} ${n} must be a whole number of at least 0`);
      }
    }
  }
};

/**
 * Translate a Workload's neutral parameters into the names the caas-k8s agent
 * reads, and refuse what it could not deploy. Applied on BOTH emit paths (the
 * selected `K8sWorkload` and a Workload child of a ContainerPlatform), exactly
 * like `withContractImageName`, which it includes:
 *
 *   image                          → containerImage
 *   port                           → containerPort
 *   cpuRequest, memoryRequest,
 *   resources.requests             → resourceRequests {cpu, memory}
 *   resources.limits               → resourceLimits {cpu, memory}
 *   maxReplicas                    → autoscaling {maxReplicas}
 *   healthCheck {path, port}       → readinessProbe and livenessProbe {path, port}
 *
 * Everything else (autoscaling, podDisruptionBudget, maxSurge, maxUnavailable,
 * terminationGracePeriodSeconds, preStopSleepSeconds, the probes,
 * topologySpread, nodeSelector, env, secretEnv) already carries its canonical
 * name.
 */
export const toKubernetesWorkloadParameters = (
  input: Record<string, unknown>,
  componentId: string,
  locked: readonly string[] = [],
): Record<string, unknown> => {
  const params = withContractImageName(input, componentId, locked);
  const neutral = take(
    params,
    'port',
    'cpuRequest',
    'memoryRequest',
    'resources',
    'maxReplicas',
    'healthCheck',
  );
  const resources = asRecord(neutral.resources);
  adopt(
    params,
    componentId,
    locked,
    {port: neutral.port},
    'containerPort',
    v => v.port,
  );
  adopt(
    params,
    componentId,
    locked,
    {
      cpuRequest: neutral.cpuRequest,
      memoryRequest: neutral.memoryRequest,
      resources: resources.requests,
    },
    'resourceRequests',
    v =>
      compact({
        cpu: v.cpuRequest,
        memory: v.memoryRequest,
        ...asRecord(v.resources),
      }),
  );
  adopt(
    params,
    componentId,
    locked,
    {resources: resources.limits},
    'resourceLimits',
    v => compact({...asRecord(v.resources)}),
  );
  adopt(
    params,
    componentId,
    locked,
    {maxReplicas: neutral.maxReplicas},
    'autoscaling',
    v => ({maxReplicas: v.maxReplicas}),
  );
  // The agent reads the older `healthCheck` as both readiness and liveness.
  for (const probe of ['readinessProbe', 'livenessProbe']) {
    adopt(
      params,
      componentId,
      locked,
      {healthCheck: neutral.healthCheck},
      probe,
      v => ({...asRecord(v.healthCheck)}),
    );
  }
  moveSecretRefsToSecretEnv(params, componentId);
  ensureDeployable(params, componentId);
  return params;
};
