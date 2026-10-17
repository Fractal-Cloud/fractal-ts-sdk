/**
 * kubernetes_workload_contract.ts — a Workload's neutral parameters in the
 * vocabulary of the caas-k8s agent's `CustomWorkloads.CaaS.KubernetesWorkload`
 * contract.
 *
 * Every key this file writes is named through `KEY`, built from the contract
 * the agent publishes (offers/generated/, see docs/offer-contracts.md), so a
 * key the agent renames or drops is a compile error here. This file used to
 * be a hand transcription of that contract, which drifted silently: `withImage`
 * shipped `image` against a contract that only declares `containerImage`.
 */

import {isSecretRef} from '../secret';
import {contractKeys} from './contract/contract_keys';
import {CustomWorkloads_CaaS_KubernetesWorkload} from './generated/custom_workloads';

/** The workload contract's keys. */
const KEY = contractKeys(CustomWorkloads_CaaS_KubernetesWorkload);

/** The contract's name for a workload's container image. */
export const KUBERNETES_WORKLOAD_IMAGE_PARAM = KEY.containerImage;

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

const refuse = (componentId: string, what: string): never => {
  throw new Error(`Kubernetes workload '${componentId}': ${what}.`);
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
  const env = params[KEY.env];
  if (env === undefined || Array.isArray(env)) {
    return;
  }
  const refs = Object.entries(asRecord(env)).filter(([, v]) => isSecretRef(v));
  if (refs.length === 0) {
    return;
  }
  const secretEnv: Record<string, unknown> = {
    ...asRecord(params[KEY.secretEnv]),
  };
  for (const [name] of refs) {
    if (Object.hasOwn(secretEnv, name)) {
      refuse(
        componentId,
        `'${name}' on '${componentId}' is in both env and secretEnv`,
      );
    }
  }
  params[KEY.env] = Object.fromEntries(
    Object.entries(asRecord(env)).filter(([, v]) => !isSecretRef(v)),
  );
  params[KEY.secretEnv] = {...secretEnv, ...Object.fromEntries(refs)};
};

/**
 * Refuse a `secretEnv` value that is not an environment-secret reference, before
 * it is stored on the Live System at all. The contract types `secretEnv` only as
 * object, so nothing after the SDK can tell a reference from the secret itself.
 */
const ensureSecretEnvReferences = (
  params: Record<string, unknown>,
  componentId: string,
): void => {
  const secretEnv = params[KEY.secretEnv];
  if (secretEnv === undefined) {
    return;
  }
  if (
    typeof secretEnv !== 'object' ||
    secretEnv === null ||
    Array.isArray(secretEnv)
  ) {
    // Whatever it holds may be the secret itself, so it is not echoed either.
    refuse(
      componentId,
      `secretEnv on '${componentId}' must map variable names to environment-secret ` +
        "references: {NAME: secretRef('<shortName>')}",
    );
  }
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
 * topologySpread, nodeSelector, env, secretEnv, ssmParameters,
 * sesIdentityArns) already carries its canonical name.
 *
 * Their values are not re-checked here: aria-agent-caas-k8s refuses the
 * component, naming the parameter, from v1.3.0 on, the first release that reads
 * these keys at all (v1.2.x reads none of them, so no agent version takes them
 * unchecked; this SDK needs v1.6.0 or later anyway), for autoscaling.maxReplicas below
 * minReplicas, a targetCpuUtilization that is not a percentage, replicas 0 with
 * autoscaling, maxSurge and maxUnavailable both 0, preStopSleepSeconds not
 * shorter than terminationGracePeriodSeconds and a probe path that is not
 * absolute (`internal/workload/spec.go`), and for an ssmParameters service,
 * access or kmsKeyArn or a sesIdentityArns entry it cannot use
 * (`internal/workload/param_grants.go`). The agent's contract does not carry
 * these rules yet, so the control plane cannot refuse them before deploy.
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
    KEY.containerPort,
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
    KEY.resourceRequests,
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
    KEY.resourceLimits,
    v => compact({...asRecord(v.resources)}),
  );
  adopt(
    params,
    componentId,
    locked,
    {maxReplicas: neutral.maxReplicas},
    KEY.autoscaling,
    v => ({maxReplicas: v.maxReplicas}),
  );
  // The agent reads the older `healthCheck` as both readiness and liveness.
  for (const probe of [KEY.readinessProbe, KEY.livenessProbe]) {
    adopt(
      params,
      componentId,
      locked,
      {healthCheck: neutral.healthCheck},
      probe,
      v => ({...asRecord(v.healthCheck)}),
    );
  }
  // Before the move: it would read a secretEnv that is not a map as empty.
  ensureSecretEnvReferences(params, componentId);
  moveSecretRefsToSecretEnv(params, componentId);
  return params;
};
