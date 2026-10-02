/**
 * retry.ts — repeating API calls through a brief control-plane outage.
 *
 * A control-plane rollout, a pod restart or a node drain answers 502/503/504 or
 * drops connections for seconds to minutes. Failing a whole `environments.deploy`
 * on that is wrong when repeating the call is safe, and dangerous when it is not:
 * `POST .../initialize` is not idempotent, and a second accepted initialize starts
 * a second run.
 *
 * WHICH CALLS ARE REPEATED
 *
 * - GET / HEAD / OPTIONS / PUT — idempotent (a PUT is a whole-state overlay), so any
 *   transient failure is repeated: 502, 503, 504, and a dropped or refused
 *   connection (ECONNRESET, ECONNREFUSED, ETIMEDOUT, EPIPE, EAI_AGAIN, "socket hang
 *   up").
 * - POST / DELETE / PATCH, and anything whose method is unknown — repeated ONLY when
 *   the failure proves no handler ran:
 *   - a 503 whose body is the control plane's own drain refusal (`reasonCode:
 *     "ServiceDraining"`), which it sends before doing anything at all;
 *   - a 503 from the ingress (Envoy) that never reached a pod: "no healthy upstream",
 *     or "upstream connect error ... reset reason: connection failure | overflow";
 *   - a refused connection (ECONNREFUSED): nothing was sent.
 *   Not on 502 or 504, not on a 503 "reset reason: connection termination" (the pod
 *   died while handling it), and not on ECONNRESET / ETIMEDOUT: the request may have
 *   been delivered and acted on.
 *
 * 4xx, 500 and ENOTFOUND are never repeated: the server answered, or the host does
 * not exist.
 *
 * HOW
 *
 * Exponential backoff with jitter (half fixed, half random, so never zero and never
 * in lockstep), from `initialDelayMs` (1 s) doubling to `maxDelayMs` (15 s). A
 * `Retry-After` the server sent is honored as a minimum. The whole sequence is
 * bounded by `maxElapsedMs` (2 min from the first attempt): a wait that would end
 * past it is not started, and the last error is thrown. Every repeat logs one WARN
 * line in the wait-mode format.
 */

export type RetryOptions = {
  /** Time budget from the first attempt; no retry starts that would end past it.
   *  Default 120000 (2 minutes). */
  maxElapsedMs?: number;
  /** First backoff. Default 1000. */
  initialDelayMs?: number;
  /** Longest backoff between two attempts (a `Retry-After` may exceed it).
   *  Default 15000. */
  maxDelayMs?: number;
  /** Suppress the WARN line logged per retry. */
  quiet?: boolean;
};

export const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'quiet'>> = {
  maxElapsedMs: 120_000,
  initialDelayMs: 1_000,
  maxDelayMs: 15_000,
};

/**
 * `cfg` with its retry WARN lines silenced when the operation runs quiet, so a
 * `quiet: true` (or fire-and-forget) call stays silent as the wait-mode contract
 * requires. A disabled policy stays disabled.
 */
export const withQuietRetries = <C extends {retry?: RetryOptions | false}>(
  cfg: C,
  quiet: boolean,
): C =>
  quiet && cfg.retry !== false
    ? {...cfg, retry: {...cfg.retry, quiet: true}}
    : cfg;

export type RetryDecision = {retry: true; reason: string} | {retry: false};

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT']);

const TRANSIENT_STATUSES = new Set([502, 503, 504]);

/** Connection failures after which the request may or may not have been delivered. */
const MAYBE_DELIVERED_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ECONNABORTED',
  'ESOCKETTIMEDOUT',
  'UND_ERR_SOCKET',
]);

/** Connection failures that prove nothing was sent. */
const NEVER_SENT_CODES = new Set(['ECONNREFUSED', 'EAI_AGAIN']);

/** Envoy's 503 bodies for a request that never reached an upstream pod. */
const NEVER_REACHED_POD =
  /no healthy upstream|reset reason: (?:local |remote )?connection failure|reset reason: overflow/i;

/** The control plane's drain refusal: sent before anything is started. */
const DRAINING_REASON_CODE = 'ServiceDraining';

type ErrorShape = {
  status?: unknown;
  code?: unknown;
  message?: unknown;
  response?: {
    status?: unknown;
    body?: unknown;
    text?: unknown;
    headers?: Record<string, unknown>;
  };
};

const statusOf = (e: ErrorShape): number | undefined => {
  const status = e.status ?? e.response?.status;
  return typeof status === 'number' ? status : undefined;
};

const codeOf = (e: ErrorShape): string | undefined => {
  if (typeof e.code === 'string' && e.code.length > 0) {
    return e.code;
  }
  if (typeof e.message === 'string' && /socket hang up/i.test(e.message)) {
    return 'ECONNRESET';
  }
  return undefined;
};

const provesNothingStarted = (e: ErrorShape): boolean => {
  const body = e.response?.body as {reasonCode?: unknown} | undefined;
  if (
    body !== null &&
    typeof body === 'object' &&
    body.reasonCode === DRAINING_REASON_CODE
  ) {
    return true;
  }
  const text = e.response?.text;
  return typeof text === 'string' && NEVER_REACHED_POD.test(text);
};

/** Whether a failed call with `method` may be repeated, and the reason to log. */
export const retryDecision = (
  method: string | undefined,
  err: unknown,
): RetryDecision => {
  const e = (err ?? {}) as ErrorShape;
  const idempotent = IDEMPOTENT_METHODS.has((method ?? '').toUpperCase());
  const status = statusOf(e);

  if (status !== undefined) {
    if (!TRANSIENT_STATUSES.has(status)) {
      return {retry: false};
    }
    if (idempotent || (status === 503 && provesNothingStarted(e))) {
      return {retry: true, reason: String(status)};
    }
    return {retry: false};
  }

  const code = codeOf(e);
  if (code === undefined) {
    return {retry: false};
  }
  if (
    NEVER_SENT_CODES.has(code) ||
    (idempotent && MAYBE_DELIVERED_CODES.has(code))
  ) {
    return {retry: true, reason: code};
  }
  return {retry: false};
};

/**
 * Backoff before retry `attempt` (1-based): the exponential step, capped, of which
 * half is fixed and half is jitter.
 */
export const backoffDelayMs = (
  attempt: number,
  opts: {initialDelayMs: number; maxDelayMs: number},
  random: () => number = Math.random,
): number => {
  const step = Math.min(
    opts.maxDelayMs,
    opts.initialDelayMs * 2 ** Math.max(0, attempt - 1),
  );
  return Math.round(step / 2 + random() * (step / 2));
};

/** A `Retry-After` header as milliseconds from `nowMs`, or undefined if unreadable. */
export const parseRetryAfterMs = (
  value: unknown,
  nowMs: number,
): number | undefined => {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1_000;
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return undefined;
  }
  const at = Date.parse(trimmed);
  return Number.isNaN(at) ? undefined : Math.max(0, at - nowMs);
};

/** The `Retry-After` of a failed response, in milliseconds. */
export const retryAfterOf = (
  err: unknown,
  nowMs: number,
): number | undefined => {
  const headers = ((err ?? {}) as ErrorShape).response?.headers;
  return headers === undefined
    ? undefined
    : parseRetryAfterMs(headers['retry-after'], nowMs);
};

/** Path of a request URL, without host or query (a query can carry a token). */
export const pathOf = (url: unknown): string => {
  if (typeof url !== 'string') {
    return 'unknown';
  }
  try {
    return new URL(url).pathname;
  } catch {
    return url.split('?')[0];
  }
};
