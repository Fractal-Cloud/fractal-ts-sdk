/**
 * service.ts — deploy a model LiveSystem to the Fractal Cloud API.
 *
 * Self-contained (the interim SDK service is unproven and not reused). Builds the
 * API payload from the model LiveSystem, submits (create or update), and — in
 * `wait` mode — polls to Active, emitting the canonical SDK wait-mode log lines
 * (see ~/Projects/CLAUDE.md "SDK — Wait Mode Log Format").
 *
 * NOTE: not runtime-verified here (no Fractal Cloud credentials) — covered by
 * mocked-HTTP unit tests in service.test.ts; smoke against the live API with real
 * credentials before release.
 */
import superagent from 'superagent';
import type {LiveSystem, OwnerRef} from './core';
import {FRACTAL_API_URL, authHeaders, sleep, elapsedSec, log} from './http';
import type {Credentials} from './http';

const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DEFAULT_TIMEOUT_MS = 600_000;
const TERMINAL_FAILURE_STATUSES = ['FailedMutation', 'Error'];

export type DeployOptions = {
  mode: 'wait' | 'fire-and-forget';
  quiet?: boolean;
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
      // Output fields are string-valued by contract; coerce defensively so the typed shape holds.
      outputFields[key] = value == null ? '' : String(value);
    }
    components[c.id] = {status: c.status ?? '', outputFields};
  }
  return {status: body.status ?? '', components};
};

// ── id formatting (matches the Fractal Cloud API contract) ───────────────────
const bcString = (bc: OwnerRef): string =>
  `${bc.ownerType ?? 'Personal'}/${bc.ownerId ?? ''}/${bc.name ?? ''}`;
const liveSystemId = (ls: LiveSystem): string =>
  `${bcString(ls.boundedContext)}/${ls.name}`;
const fractalApiId = (ls: LiveSystem): string =>
  `${bcString(ls.boundedContext)}/${ls.fractalName}:${ls.version.major}.${ls.version.minor}.${ls.version.patch}`;

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

// ── blueprint (Fractal) registration ─────────────────────────────────────────
// The API rejects a LiveSystem whose Fractal (blueprint) is not registered
// (`reasonCode: BlueprintDoesNotExist`). `createFractal` authors the blueprint
// locally only; deploying must first upsert it to the control plane. The
// blueprint URL is the fractal id with `:` → `/`
// (`/blueprints/Personal/<ownerId>/<shortName>/<name>/<version>`).
const buildBlueprintBody = (ls: LiveSystem) => ({
  description: `${ls.fractalName} — authored via the Fractal Cloud TypeScript SDK`,
  isPrivate: false,
  components: ls.components.map(c => ({
    type: c.type,
    id: c.id,
    displayName: c.displayName,
    provider: c.provider,
    deliveryModel: c.deliveryModel,
    parameters: c.parameters,
    dependencies: [...c.dependencies],
    links: c.links.map(l => ({
      componentId: l.componentId,
      settings: l.settings,
    })),
  })),
});

const publishBlueprint = async (
  ls: LiveSystem,
  creds: Credentials,
): Promise<void> => {
  const url = `${FRACTAL_API_URL}/blueprints/${fractalApiId(ls).replace(':', '/')}`;
  const existing = await superagent
    .get(url)
    .ok(res => res.status === 200 || res.status === 404)
    .set(authHeaders(creds));
  const body = buildBlueprintBody(ls);
  if (existing.status === 200) {
    await superagent.put(url).set(authHeaders(creds)).send(body);
  } else {
    await superagent.post(url).set(authHeaders(creds)).send(body);
  }
};

// ── HTTP ─────────────────────────────────────────────────────────────────────
const submit = async (ls: LiveSystem, creds: Credentials): Promise<void> => {
  // Ensure the Fractal (blueprint) exists before the LiveSystem references it.
  await publishBlueprint(ls, creds);
  const id = liveSystemId(ls);
  const url = `${FRACTAL_API_URL}/livesystems/${id}`;
  const existing = await superagent
    .get(url)
    .ok(res => res.status === 200 || res.status === 404)
    .set(authHeaders(creds));
  const body = buildBody(ls);
  if (existing.status === 200) {
    await superagent.put(url).set(authHeaders(creds)).send(body);
  } else {
    await superagent
      .post(`${FRACTAL_API_URL}/livesystems`)
      .set(authHeaders(creds))
      .send(body);
  }
};

const fetchLiveSystem = async (
  id: string,
  creds: Credentials,
): Promise<LiveSystemBody> => {
  const res = await superagent
    .get(`${FRACTAL_API_URL}/livesystems/${id}`)
    .set(authHeaders(creds));
  return res.body as LiveSystemBody;
};

const getStatus = async (id: string, creds: Credentials): Promise<string> => {
  return (await fetchLiveSystem(id, creds)).status ?? '';
};

const pollUntilActive = async (
  ls: LiveSystem,
  creds: Credentials,
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
      status = await getStatus(id, creds);
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

// ── public API ───────────────────────────────────────────────────────────────
/** Deploy (create or update) a LiveSystem. `fire-and-forget` submits and returns `undefined`;
 *  `wait` polls until Active (or failure/timeout) emitting wait-mode log lines, then resolves to
 *  the deployed {@link LiveSystemState} so callers can read component output fields (e.g. a VM's
 *  `privateIp`) without a second round-trip. */
export async function deploy(
  ls: LiveSystem,
  creds: Credentials,
  opts: DeployOptions = {mode: 'fire-and-forget'},
): Promise<LiveSystemState | undefined> {
  if (opts.mode === 'fire-and-forget') {
    await submit(ls, creds);
    return undefined;
  }
  const quiet = opts.quiet ?? false;
  const startMs = Date.now();
  log(quiet, 'INFO', 'Deploying Live System', {
    system: liveSystemId(ls),
    fractal: fractalApiId(ls),
  });
  await submit(ls, creds);
  await pollUntilActive(ls, creds, opts, startMs);
  log(quiet, 'INFO', 'Live System Active', {
    system: liveSystemId(ls),
    elapsed: elapsedSec(startMs),
  });
  return getLiveSystemOutputs(ls, creds);
}

/**
 * Read a deployed LiveSystem's per-component output fields (vendor-neutral). Use this after a
 * `fire-and-forget` deploy to poll for outputs, or any time to re-read the current state. The
 * returned shape is identical regardless of vendor.
 *
 * @param target the model LiveSystem, or its live-system id string.
 */
export async function getLiveSystemOutputs(
  target: LiveSystem | string,
  creds: Credentials,
): Promise<LiveSystemState> {
  const id = typeof target === 'string' ? target : liveSystemId(target);
  return toLiveSystemState(await fetchLiveSystem(id, creds));
}

/** Destroy a deployed LiveSystem. */
export async function destroy(
  ls: LiveSystem,
  creds: Credentials,
): Promise<void> {
  await superagent
    .delete(`${FRACTAL_API_URL}/livesystems/${liveSystemId(ls)}`)
    .set(authHeaders(creds));
}
