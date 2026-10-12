/**
 * service.ts — LiveSystem operations against the Fractal Cloud API.
 *
 * Builds the API payload from the model LiveSystem, submits (create or update),
 * and — in `wait` mode — polls to Active, emitting the canonical SDK wait-mode log
 * lines (see ~/Projects/CLAUDE.md "SDK — Wait Mode Log Format").
 *
 * A LiveSystem is a different entity from a Blueprint, so these operations touch
 * `/livesystems` ONLY. Registering the blueprint a LiveSystem instantiates is a
 * separate operation (`cloud.blueprints.create`, see client.ts) — deploying must
 * never publish one as a side effect, because a LiveSystem knows only resolved
 * Offers and would therefore register a vendor-locked blueprint.
 *
 * Reached through the client (client.ts), which holds credentials and base URL.
 *
 * NOTE: not runtime-verified here (no Fractal Cloud credentials) — covered by
 * mocked-HTTP unit tests in client.test.ts; smoke against the live API with real
 * credentials before release.
 */
import {withRetryLogging} from './retry';
import superagent from 'superagent';
import type {LiveSystem} from './core';
import {
  apiUrl,
  authHeaders,
  bcString,
  pathSegment,
  versionString,
  sleep,
  elapsedSec,
  log,
} from './http';
import type {ApiConfig} from './http';
import {FractalApiError, sanitizeApiError, send} from './api-error';
import type {ParameterValidationResult} from './validation/parameter_validation_result';
import {LiveSystemValidationError} from './validation/live_system_validation_error';

const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DEFAULT_TIMEOUT_MS = 600_000;
const TERMINAL_FAILURE_STATUSES = ['FailedMutation', 'Error'];

export type DeployOptions = {
  mode: 'wait' | 'fire-and-forget';
  quiet?: boolean;
  /**
   * Skip the control plane's parameter validation that runs before the Live
   * System is submitted. The control plane still checks the create or update
   * itself; this only drops the early, side-effect-free check.
   */
  skipValidation?: boolean;
  pollIntervalMs?: number;
  timeoutMs?: number;
};

/** Reconciliation state + published output fields of a single deployed component. */
export type ComponentState = {
  status: string;
  /**
   * Output fields the agent published for this component — vendor-agnostic and identical in shape
   * across clouds. For a VM this includes `privateIp`, `publicIp`, `region`, `machineType`, etc.
   * (see the VM output-field contract). Never contains raw secrets — only references.
   */
  outputFields: Record<string, string>;
};

/**
 * A deployed LiveSystem's state: its overall status plus every component's status and output
 * fields, keyed by component id. The shape is identical regardless of vendor — a consumer reads
 * `state.components['vllm-host'].outputFields.privateIp` without knowing the cloud.
 */
export type LiveSystemState = {
  status: string;
  components: Record<string, ComponentState>;
};

// Control-plane GET /livesystems/{id} body shape (authoritative: mirrors the agent's LiveSystem /
// LiveComponent serialization — `components[]` each carrying `id`, `status`, `outputFields`).
type LiveSystemBody = {
  status?: string;
  components?: Array<{
    id?: string;
    status?: string;
    outputFields?: Record<string, unknown>;
  }>;
};

const toLiveSystemState = (body: LiveSystemBody): LiveSystemState => {
  const components: Record<string, ComponentState> = {};
  for (const c of body.components ?? []) {
    if (!c.id) {
      continue;
    }
    const outputFields: Record<string, string> = {};
    for (const [key, value] of Object.entries(c.outputFields ?? {})) {
      // Output fields are string-valued by contract; coerce defensively so the typed shape holds. A
      // structured value becomes its JSON, which a caller can parse back, never `[object Object]`.
      outputFields[key] =
        value === null || value === undefined
          ? ''
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);
    }
    components[c.id] = {status: c.status ?? '', outputFields};
  }
  return {status: body.status ?? '', components};
};

// ── id formatting (matches the Fractal Cloud API contract) ───────────────────
const liveSystemId = (ls: LiveSystem): string =>
  `${bcString(ls.boundedContext)}/${pathSegment(ls.name)}`;
/** The Fractal (blueprint) this LiveSystem instantiates. Referenced by id only —
 *  the blueprint itself is registered by a separate operation. */
const fractalApiId = (ls: LiveSystem): string =>
  `${bcString(ls.boundedContext)}/${pathSegment(ls.fractalName)}:${versionString(ls.version)}`;

// ── payload ──────────────────────────────────────────────────────────────────
const buildBody = (ls: LiveSystem) => ({
  liveSystemId: liveSystemId(ls),
  fractalId: fractalApiId(ls),
  blueprintMap: ls.components.reduce(
    (acc, c) => {
      acc[c.id] = {
        type: c.type,
        id: c.id,
        displayName: c.displayName,
        provider: c.provider,
        deliveryModel: c.deliveryModel,
        // Only a referencing component carries the key, so every other body is
        // unchanged byte for byte.
        ...(c.reference === undefined
          ? {}
          : {
              reference: {
                liveSystemId: c.reference.liveSystemId,
                componentId: c.reference.componentId,
              },
            }),
        parameters: c.parameters,
        dependencies: [...c.dependencies],
        links: c.links.map(l => ({
          componentId: l.componentId,
          settings: l.settings,
        })),
      };
      return acc;
    },
    {} as Record<string, unknown>,
  ),
  environment: {
    id: {
      type: ls.environment.ownerType ?? 'Personal',
      ownerId: ls.environment.ownerId ?? '',
      shortName: ls.environment.name ?? '',
    },
    parameters: {},
  },
});

// ── HTTP ─────────────────────────────────────────────────────────────────────
// The API rejects a LiveSystem whose Fractal (blueprint) is not registered
// (`reasonCode: BlueprintDoesNotExist`). Registering it is the caller's separate
// step — `cloud.blueprints.create(fractal)` — not something deploy does for them.
/**
 * Deploying no longer registers the blueprint, so "Fractal not registered" is now
 * a reachable first-run failure. The API reports it as `BlueprintDoesNotExist`,
 * which surfaces as an opaque HTTP error — rethrow it naming the call the caller
 * is missing.
 */
const withBlueprintHint = (
  err: FractalApiError,
  ls: LiveSystem,
): FractalApiError | Error => {
  // Reads the sanitized `reasonCode`, not `err.response.body`: by the time an
  // error reaches here it has been through the boundary in api-error.ts, which
  // drops the response object because it holds the credential header block.
  if (err.reasonCode !== 'BlueprintDoesNotExist') {
    return err;
  }
  // No `cause: err` — inspection follows cause chains, and a cause is one more
  // place a future refactor could reintroduce request state. Nothing is lost: the
  // sanitized error's own message is folded in instead.
  return new Error(
    `Fractal '${fractalApiId(ls)}' is not registered, so the Live System cannot ` +
      'reference it. A blueprint and a Live System are separate entities: register ' +
      `the blueprint first with \`cloud.blueprints.create(fractal)\`. (${err.message})`,
  );
};

/** Does the Live System exist already (so a deploy updates it)? */
const liveSystemExists = async (
  ls: LiveSystem,
  cfg: ApiConfig,
): Promise<boolean> => {
  const existing = await send(cfg, () =>
    superagent
      .get(apiUrl(cfg, `/livesystems/${liveSystemId(ls)}`))
      .ok(res => res.status === 200 || res.status === 404)
      .set(authHeaders(cfg)),
  );
  return existing.status === 200;
};

const isValidationResult = (body: unknown): body is ParameterValidationResult =>
  typeof body === 'object' &&
  body !== null &&
  typeof (body as {valid?: unknown}).valid === 'boolean' &&
  Array.isArray((body as {components?: unknown}).components) &&
  Array.isArray((body as {liveSystemIssues?: unknown}).liveSystemIssues) &&
  typeof (body as {summary?: unknown}).summary === 'object';

/**
 * Asks the control plane what creating (or updating) the Live System would
 * answer about its component parameters, without changing anything. Undefined
 * when the control plane offers no validation (an older one answers 404).
 */
const requestValidation = async (
  ls: LiveSystem,
  cfg: ApiConfig,
  exists: boolean,
): Promise<ParameterValidationResult | undefined> => {
  const url = exists
    ? apiUrl(cfg, `/livesystems/${liveSystemId(ls)}/validate`)
    : apiUrl(cfg, '/livesystems/validate');
  const res = await send(cfg, () =>
    superagent
      .post(url)
      .ok(r => r.status === 200 || r.status === 404 || r.status === 405)
      .set(authHeaders(cfg))
      .send(buildBody(ls)),
  );
  return res.status === 200 && isValidationResult(res.body)
    ? res.body
    : undefined;
};

/**
 * The control plane's parameter validation of a Live System, before it is
 * deployed: every component's parameters against the contract of its offer.
 * Undefined when the control plane offers no validation.
 */
export async function validateLiveSystem(
  ls: LiveSystem,
  cfg: ApiConfig,
): Promise<ParameterValidationResult | undefined> {
  return requestValidation(ls, cfg, await liveSystemExists(ls, cfg));
}

/**
 * Reports a validation result in wait mode (one summary line on failure, one
 * line per warning) and refuses the deploy when any issue is blocking.
 */
const enforceValidation = (
  ls: LiveSystem,
  result: ParameterValidationResult | undefined,
  quiet: boolean,
): void => {
  const system = liveSystemId(ls);
  if (result === undefined) {
    log(quiet, 'WARN', 'Live System validation unavailable, submitting', {
      system,
    });
    return;
  }
  const warnings = [
    ...result.liveSystemIssues.map(issue => ({
      issue,
      component: '',
      field: '',
    })),
    ...result.components.flatMap(c =>
      c.fields.flatMap(f =>
        f.issues.map(issue => ({
          issue,
          component: c.componentId,
          field: f.field,
        })),
      ),
    ),
  ].filter(w => !w.issue.blocking && w.issue.severity === 'warn');
  for (const {issue, component, field} of warnings) {
    log(quiet, 'WARN', `Live System validation warning: ${issue.message}`, {
      system,
      ...(component === '' ? {} : {component}),
      ...(field === '' ? {} : {field}),
      code: issue.code,
    });
  }
  if (!result.valid) {
    log(quiet, 'ERROR', 'Live System validation failed', {
      system,
      errors: result.summary.errors,
      warnings: result.summary.warnings,
    });
    throw new LiveSystemValidationError(system, result);
  }
};

const submit = async (
  ls: LiveSystem,
  cfg: ApiConfig,
  exists: boolean,
): Promise<void> => {
  const id = liveSystemId(ls);
  const url = apiUrl(cfg, `/livesystems/${id}`);
  const body = buildBody(ls);
  try {
    if (exists) {
      await send(cfg, () =>
        superagent.put(url).set(authHeaders(cfg)).send(body),
      );
    } else {
      await send(cfg, () =>
        superagent
          .post(apiUrl(cfg, '/livesystems'))
          .set(authHeaders(cfg))
          .send(body),
      );
    }
  } catch (err) {
    // Sanitize here as well as inside `send`: a request builder that throws
    // SYNCHRONOUSLY (a bad URL, a mocked client) never reaches `send`'s try, so
    // this is the only place that would see the raw object.
    const sanitized = sanitizeApiError(err, cfg);
    if (sanitized.reasonCode === 'OfferParametersInvalid') {
      throw new LiveSystemValidationError(id, undefined, sanitized.message);
    }
    throw withBlueprintHint(sanitized, ls);
  }
};

const fetchLiveSystem = async (
  id: string,
  cfg: ApiConfig,
): Promise<LiveSystemBody> => {
  const res = await send(cfg, () =>
    superagent.get(apiUrl(cfg, `/livesystems/${id}`)).set(authHeaders(cfg)),
  );
  return res.body as LiveSystemBody;
};

const getStatus = async (id: string, cfg: ApiConfig): Promise<string> => {
  return (await fetchLiveSystem(id, cfg)).status ?? '';
};

const pollUntilActive = async (
  ls: LiveSystem,
  cfg: ApiConfig,
  opts: DeployOptions,
  startMs: number,
): Promise<void> => {
  const quiet = opts.quiet ?? false;
  const interval = opts.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const deadline = Date.now() + (opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const id = liveSystemId(ls);
  let round = 0;
  while (Date.now() < deadline) {
    await sleep(interval);
    round++;
    let status: string;
    try {
      status = await getStatus(id, cfg);
    } catch (err) {
      const code = (err as {status?: number}).status;
      // 4xx will not self-heal (auth/not-found/etc.) — fail fast.
      if (code !== undefined && code >= 400 && code < 500) {
        log(quiet, 'ERROR', 'Fatal error polling Live System status', {
          system: id,
          round,
          elapsed: elapsedSec(startMs),
        });
        throw err;
      }
      // Transient (network error / 5xx) — log and retry on the next interval.
      log(quiet, 'WARN', 'Transient error polling status, retrying', {
        system: id,
        round,
        elapsed: elapsedSec(startMs),
      });
      continue;
    }
    if (status === 'Active') {
      return;
    }
    if (TERMINAL_FAILURE_STATUSES.includes(status)) {
      log(quiet, 'ERROR', 'Live System deployment failed', {
        system: id,
        status,
        elapsed: elapsedSec(startMs),
      });
      throw new Error(`Live system deployment failed with status: ${status}`);
    }
    log(quiet, 'CHECK', 'Polling Live System status', {
      system: id,
      round,
      status,
      elapsed: elapsedSec(startMs),
    });
  }
  log(quiet, 'ERROR', 'Live System deployment timed out', {
    system: id,
    elapsed: elapsedSec(startMs),
    timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });
  throw new Error('Live system deployment timed out');
};

// ── operations (reached via the client's `liveSystems` namespace) ────────────
/** Deploy (create or update) a LiveSystem. `fire-and-forget` submits and returns `undefined`;
 *  `wait` polls until Active (or failure/timeout) emitting wait-mode log lines, then resolves to
 *  the deployed {@link LiveSystemState} so callers can read component output fields (e.g. a VM's
 *  `privateIp`) without a second round-trip. */
export async function deployLiveSystem(
  ls: LiveSystem,
  apiConfig: ApiConfig,
  opts: DeployOptions = {mode: 'fire-and-forget'},
): Promise<LiveSystemState | undefined> {
  // Fire-and-forget emits no logs (wait-mode contract), retry warnings included.
  const cfg = withRetryLogging(
    apiConfig,
    opts.mode === 'fire-and-forget' || (opts.quiet ?? false),
  );
  const silent = opts.mode === 'fire-and-forget' || (opts.quiet ?? false);
  const quiet = opts.quiet ?? false;
  const startMs = Date.now();
  if (opts.mode === 'wait') {
    log(quiet, 'INFO', 'Deploying Live System', {
      system: liveSystemId(ls),
      fractal: fractalApiId(ls),
    });
  }
  const exists = await liveSystemExists(ls, cfg);
  if (!(opts.skipValidation ?? false)) {
    enforceValidation(ls, await requestValidation(ls, cfg, exists), silent);
  }
  await submit(ls, cfg, exists);
  if (opts.mode === 'fire-and-forget') {
    return undefined;
  }
  await pollUntilActive(ls, cfg, opts, startMs);
  log(quiet, 'INFO', 'Live System Active', {
    system: liveSystemId(ls),
    elapsed: elapsedSec(startMs),
  });
  return liveSystemOutputs(ls, cfg);
}

/**
 * Read a deployed LiveSystem's per-component output fields (vendor-neutral). Use this after a
 * `fire-and-forget` deploy to poll for outputs, or any time to re-read the current state. The
 * returned shape is identical regardless of vendor.
 *
 * @param target the model LiveSystem, or its live-system id string.
 */
export async function liveSystemOutputs(
  target: LiveSystem | string,
  cfg: ApiConfig,
): Promise<LiveSystemState> {
  const id = typeof target === 'string' ? target : liveSystemId(target);
  return toLiveSystemState(await fetchLiveSystem(id, cfg));
}

/** Destroy a deployed LiveSystem. The blueprint it instantiated is untouched. */
export async function destroyLiveSystem(
  ls: LiveSystem,
  cfg: ApiConfig,
): Promise<void> {
  await send(cfg, () =>
    superagent
      .delete(apiUrl(cfg, `/livesystems/${liveSystemId(ls)}`))
      .set(authHeaders(cfg)),
  );
}
