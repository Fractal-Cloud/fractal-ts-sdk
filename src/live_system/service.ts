import {ServiceAccountCredentials} from '../values/service_account_credentials';
import superagent from 'superagent';
import {LiveSystem} from './index';

const CLIENT_ID_HEADER = 'X-ClientID';
const CLIENT_SECRET_HEADER = 'X-ClientSecret';
const FRACTAL_API_URL = 'https://api.fractal.cloud';

const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DEFAULT_TIMEOUT_MS = 600_000;

const TERMINAL_FAILURE_STATUSES: LiveSystem.Status[] = [
  'FailedMutation',
  'Error',
];

// ── internal helpers ──────────────────────────────────────────────────────────

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const log = (
  quiet: boolean,
  level: 'INFO' | 'CHECK' | 'WARN' | 'ERROR',
  message: string,
  fields?: Record<string, string | number>,
): void => {
  if (quiet) return;
  const ts = new Date().toISOString();
  const fieldStr = fields
    ? '  ' +
      Object.entries(fields)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')
    : '';
  console.log(`[${ts}] ${level.padEnd(5)} ${message}${fieldStr}`);
};

const elapsedSec = (startMs: number): string =>
  `${Math.round((Date.now() - startMs) / 1000)}s`;

/**
 * Converts a raw superagent error into a descriptive Error with context.
 * Includes the operation name, target ID, HTTP status (if any), and response
 * body (if any) so the caller always knows what went wrong and where.
 */
const toApiError = (operation: string, target: string, err: unknown): Error => {
  const e = err as {status?: number; response?: {text?: string}};
  const status = e.status ? `HTTP ${e.status}` : 'network error';
  const body = e.response?.text?.trim();
  const detail = body ? ` — ${body}` : '';
  return new Error(`${operation} failed (${status}) for ${target}${detail}`);
};

/**
 * Returns true for 4xx client errors that will not self-heal on retry
 * (e.g. 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable).
 */
const isClientError = (err: unknown): boolean => {
  const status = (err as {status?: number}).status;
  return status !== undefined && status >= 400 && status < 500;
};

const authHeaders = (credentials: ServiceAccountCredentials) => ({
  [CLIENT_ID_HEADER]: credentials.id.serviceAccountIdValue,
  [CLIENT_SECRET_HEADER]: credentials.secret,
});

const buildBody = (liveSystem: LiveSystem) => ({
  liveSystemId: liveSystem.id.toString(),
  fractalId: liveSystem.fractalId.toString(),
  description: liveSystem.description,
  provider: liveSystem.genericProvider,
  blueprintMap: liveSystem.components.reduce(
    (acc, c) => {
      acc[c.id.value.toString()] = {
        ...c,
        type: c.type.toString(),
        id: c.id.value.toString(),
        version: c.version.toString(),
        parameters: c.parameters.toMap(),
        dependencies: c.dependencies.map(d => d.id.value.toString()),
        links: c.links.map(l => ({
          componentId: l.id.value.toString(),
          settings: l.parameters.toMap(),
        })),
        outputFields: c.outputFields.value,
      };
      return acc;
    },
    {} as Record<string, {}>,
  ),
  parameters: liveSystem.parameters.toMap(),
  environment: {
    id: {
      type: liveSystem.environment.id.ownerType,
      ownerId: liveSystem.environment.id.ownerId.toString(),
      shortName: liveSystem.environment.id.name.toString(),
    },
    parameters: liveSystem.environment.parameters.toMap(),
  },
});

const submitDeploy = async (
  credentials: ServiceAccountCredentials,
  liveSystem: LiveSystem,
): Promise<void> => {
  const target = liveSystem.id.toString();
  const liveSystemUrl = `${FRACTAL_API_URL}/livesystems/${target}`;

  let getResponse;
  try {
    getResponse = await superagent
      .get(liveSystemUrl)
      .ok(res => res.status === 200 || res.status === 404)
      .set(authHeaders(credentials))
      .send();
  } catch (err) {
    throw toApiError('check live system existence', target, err);
  }

  const request =
    getResponse.status === 200
      ? superagent.put(liveSystemUrl)
      : superagent.post(`${FRACTAL_API_URL}/livesystems`);

  try {
    await request.set(authHeaders(credentials)).send(buildBody(liveSystem));
  } catch (err) {
    const op =
      getResponse.status === 200 ? 'update live system' : 'create live system';
    throw toApiError(op, target, err);
  }
};

const getLiveSystemStatus = async (
  credentials: ServiceAccountCredentials,
  id: LiveSystem.Id,
): Promise<LiveSystem.Status> => {
  try {
    const response = await superagent
      .get(`${FRACTAL_API_URL}/livesystems/${id.toString()}`)
      .set(authHeaders(credentials))
      .send();
    return response.body.status as LiveSystem.Status;
  } catch (err) {
    throw toApiError('get live system status', id.toString(), err);
  }
};

const pollUntilActive = async (
  credentials: ServiceAccountCredentials,
  id: LiveSystem.Id,
  options: LiveSystem.DeployOptions,
  startMs: number,
): Promise<void> => {
  const quiet = options.quiet ?? false;
  const interval = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeout;
  let round = 0;

  while (Date.now() < deadline) {
    await sleep(interval);
    round++;

    let status: LiveSystem.Status;
    try {
      status = await getLiveSystemStatus(credentials, id);
    } catch (err) {
      // 4xx errors won't self-heal — fail immediately
      if (isClientError(err)) {
        const message = err instanceof Error ? err.message : String(err);
        log(quiet, 'ERROR', 'Fatal error polling Live System status', {
          system: id.toString(),
          round,
          elapsed: elapsedSec(startMs),
          error: message,
        });
        throw err;
      }
      // Transient (network error, 5xx) — log and retry on next interval
      const message = err instanceof Error ? err.message : String(err);
      log(quiet, 'WARN', 'Transient error polling status, will retry', {
        system: id.toString(),
        round,
        elapsed: elapsedSec(startMs),
        error: message,
      });
      continue;
    }

    if (status === 'Active') return;

    if (TERMINAL_FAILURE_STATUSES.includes(status)) {
      log(quiet, 'ERROR', 'Live System deployment failed', {
        system: id.toString(),
        status,
        elapsed: elapsedSec(startMs),
      });
      throw new Error(
        `Live system deployment failed with status: ${status} — check the Fractal Cloud console for component-level errors`,
      );
    }

    log(quiet, 'CHECK', 'Polling Live System status', {
      system: id.toString(),
      round,
      status,
      elapsed: elapsedSec(startMs),
    });
  }

  log(quiet, 'ERROR', 'Live System deployment timed out', {
    system: id.toString(),
    elapsed: elapsedSec(startMs),
    timeoutMs: timeout,
  });
  throw new Error(
    `Live system deployment timed out after ${timeout}ms. ` +
      'Increase timeoutMs in DeployOptions if provisioning takes longer.',
  );
};

// ── public API ────────────────────────────────────────────────────────────────

const deployLiveSystem = async (
  credentials: ServiceAccountCredentials,
  liveSystem: LiveSystem,
  options: LiveSystem.DeployOptions = {mode: 'fire-and-forget'},
): Promise<void> => {
  if (options.mode === 'fire-and-forget') {
    // Submit and return immediately. Errors are logged but not thrown.
    submitDeploy(credentials, liveSystem).catch(err => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Fractal] live system deploy error: ${message}`);
    });
    return;
  }

  // wait: submit then poll until Active (or failure/timeout)
  const quiet = options.quiet ?? false;
  const startMs = Date.now();
  log(quiet, 'INFO', 'Deploying Live System', {
    system: liveSystem.id.toString(),
    fractal: liveSystem.fractalId.toString(),
    provider: liveSystem.genericProvider,
  });
  await submitDeploy(credentials, liveSystem);
  await pollUntilActive(credentials, liveSystem.id, options, startMs);
  log(quiet, 'INFO', 'Live System Active', {
    system: liveSystem.id.toString(),
    elapsed: elapsedSec(startMs),
  });
};

const destroyLiveSystem = async (
  credentials: ServiceAccountCredentials,
  id: LiveSystem.Id,
): Promise<void> => {
  try {
    await superagent
      .delete(`${FRACTAL_API_URL}/livesystems/${id.toString()}`)
      .set(authHeaders(credentials));
  } catch (err) {
    throw toApiError('destroy live system', id.toString(), err);
  }
};

export namespace LiveSystemService {
  export const deploy = deployLiveSystem;
  export const destroy = destroyLiveSystem;
}
