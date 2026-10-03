/**
 * retry.test.ts — which failed API calls the SDK repeats, and how.
 *
 * A control-plane rollout or a pod restart answers 502/503/504 or drops the
 * connection for a short while. Repeating a call is only safe when repeating it
 * cannot do the work twice: GET and PUT (a whole-state overlay) are idempotent, so
 * any transient failure is retried; POST and DELETE are retried only when the
 * failure proves the request never reached a handler.
 */
import {afterEach, describe, expect, it, vi} from 'vitest';
import {FractalApiError, send} from './api-error';
import {
  MIN_RETRY_DELAY_MS,
  backoffDelayMs,
  parseRetryAfterMs,
  resolveRetryOptions,
  retryDecision,
  withRetryLogging,
} from './retry';

const httpError = (
  status: number,
  response: {body?: unknown; text?: string; headers?: Record<string, string>} = {},
) =>
  Object.assign(new Error(`HTTP ${status}`), {
    status,
    response: {status, headers: {}, ...response},
  });

const networkError = (code: string, message = code) =>
  Object.assign(new Error(message), {code});

const draining = () =>
  httpError(503, {
    body: {reasonCode: 'ServiceDraining', message: 'shutting down'},
    headers: {'retry-after': '5'},
  });

describe('retryDecision', () => {
  it.each(['GET', 'PUT', 'HEAD'])('retries %s on 502, 503 and 504', method => {
    for (const status of [502, 503, 504]) {
      expect(retryDecision(method, httpError(status)).retry).toBe(true);
    }
  });

  it.each(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE', 'EAI_AGAIN'])(
    'retries GET on a dropped connection: %s',
    code => {
      expect(retryDecision('GET', networkError(code)).retry).toBe(true);
    },
  );

  it('retries GET on a socket hang up', () => {
    expect(
      retryDecision('GET', networkError('ECONNRESET', 'socket hang up')).retry,
    ).toBe(true);
  });

  it.each([400, 401, 403, 404, 409, 500, 507])(
    'never retries a %s: the server answered',
    status => {
      expect(retryDecision('GET', httpError(status)).retry).toBe(false);
      expect(retryDecision('PUT', httpError(status)).retry).toBe(false);
    },
  );

  it('never retries an unknown host: a typo does not heal', () => {
    expect(retryDecision('GET', networkError('ENOTFOUND')).retry).toBe(false);
  });

  // POST /initialize is not idempotent: a second accepted initialize starts a
  // second run. Only a failure that proves nothing was started may be repeated.
  it.each(['POST', 'DELETE', 'PATCH'])(
    'retries %s on the control plane draining 503, which starts nothing',
    method => {
      expect(retryDecision(method, draining()).retry).toBe(true);
    },
  );

  const envoy = (text: string, headers: Record<string, string> = {}) =>
    httpError(503, {text, headers: {'content-type': 'text/plain', ...headers}});

  it.each([
    'no healthy upstream',
    'upstream connect error or disconnect/reset before headers. reset reason: connection failure',
    'upstream connect error or disconnect/reset before headers. reset reason: remote connection failure, transport failure reason: delayed connect error: 111',
    'upstream connect error or disconnect/reset before headers. reset reason: overflow',
  ])('retries POST on an ingress 503 that never reached a pod: %s', text => {
    expect(retryDecision('POST', envoy(text)).retry).toBe(true);
  });

  it.each([
    'upstream connect error or disconnect/reset before headers. reset reason: connection termination',
    // Envoy retried: an earlier attempt may have reached a pod.
    'upstream connect error or disconnect/reset before headers. retried and the latest reset reason: connection failure',
    'Service Unavailable',
    '',
  ])('does not retry POST on a 503 that may have reached a handler: "%s"', text => {
    expect(retryDecision('POST', envoy(text)).retry).toBe(false);
  });

  // A service that acted and then quotes a downstream Envoy error in its own body
  // must not be mistaken for the ingress refusing before any pod saw the request.
  it('does not retry POST when the phrase is quoted inside a service response', () => {
    const quoted = httpError(503, {
      body: {message: 'dependency failed: no healthy upstream'},
      text: '{"message":"dependency failed: no healthy upstream"}',
      headers: {'content-type': 'application/json'},
    });
    expect(retryDecision('POST', quoted).retry).toBe(false);
    expect(
      retryDecision('POST', envoy('error: no healthy upstream, try later')).retry,
    ).toBe(false);
  });

  it('does not retry POST when an upstream answered (Envoy timed it)', () => {
    expect(
      retryDecision(
        'POST',
        envoy('no healthy upstream', {'x-envoy-upstream-service-time': '12'}),
      ).retry,
    ).toBe(false);
  });

  it.each([502, 504])('does not retry POST on %s: the handler may have run', status => {
    expect(retryDecision('POST', httpError(status)).retry).toBe(false);
  });

  it.each(['ECONNRESET', 'ETIMEDOUT', 'EPIPE'])(
    'does not retry POST on %s: the request may have been delivered',
    code => {
      expect(retryDecision('POST', networkError(code)).retry).toBe(false);
    },
  );

  it('retries POST when the connection was refused: nothing was sent', () => {
    expect(retryDecision('POST', networkError('ECONNREFUSED')).retry).toBe(true);
  });

  it('treats an unknown method as not idempotent', () => {
    expect(retryDecision(undefined, httpError(502)).retry).toBe(false);
    expect(retryDecision(undefined, draining()).retry).toBe(true);
  });
});

describe('backoff', () => {
  const opts = {initialDelayMs: 1_000, maxDelayMs: 15_000};

  it('grows exponentially, with jitter, up to the cap', () => {
    expect(backoffDelayMs(1, opts, () => 0)).toBe(500);
    expect(backoffDelayMs(1, opts, () => 1)).toBe(1_000);
    expect(backoffDelayMs(2, opts, () => 1)).toBe(2_000);
    expect(backoffDelayMs(3, opts, () => 1)).toBe(4_000);
    expect(backoffDelayMs(10, opts, () => 1)).toBe(15_000);
    expect(backoffDelayMs(10, opts, () => 0)).toBe(7_500);
  });

  it('never waits zero: a fleet of clients must not retry in lockstep at once', () => {
    for (let attempt = 1; attempt < 8; attempt++) {
      expect(backoffDelayMs(attempt, opts, () => 0)).toBeGreaterThan(0);
    }
  });
});

describe('retry options', () => {
  it('falls back to the defaults for missing, non-finite or non-positive values', () => {
    expect(
      resolveRetryOptions({
        maxElapsedMs: undefined,
        initialDelayMs: Number.NaN,
        maxDelayMs: -5,
      }),
    ).toEqual({maxElapsedMs: 120_000, initialDelayMs: 1_000, maxDelayMs: 15_000});
  });

  it('never lets a delay go below the floor, so a bad option cannot hammer the server', () => {
    const resolved = resolveRetryOptions({initialDelayMs: 0.001, maxDelayMs: 0.001});
    expect(backoffDelayMs(1, resolved, () => 0)).toBeGreaterThanOrEqual(MIN_RETRY_DELAY_MS / 2);
  });

  it('keeps valid values', () => {
    expect(
      resolveRetryOptions({maxElapsedMs: 300_000, initialDelayMs: 200, maxDelayMs: 5_000}),
    ).toEqual({maxElapsedMs: 300_000, initialDelayMs: 200, maxDelayMs: 5_000});
  });

  it('logs only inside an operation that logs, unless told otherwise', () => {
    const base = {clientId: 'c', clientSecret: 's'};
    expect(withRetryLogging(base, false).retry).toEqual({quiet: false});
    expect(withRetryLogging(base, true).retry).toEqual({quiet: true});
    expect(withRetryLogging({...base, retry: {quiet: true}}, false).retry).toEqual({quiet: true});
    expect(withRetryLogging({...base, retry: false as const}, false).retry).toBe(false);
  });
});

describe('parseRetryAfterMs', () => {
  const now = Date.parse('2026-10-02T09:00:00Z');

  it('reads delta-seconds', () => {
    expect(parseRetryAfterMs('5', now)).toBe(5_000);
    expect(parseRetryAfterMs('0', now)).toBe(0);
  });

  it('reads an HTTP date', () => {
    expect(parseRetryAfterMs('Fri, 02 Oct 2026 09:00:30 GMT', now)).toBe(30_000);
  });

  it('ignores what it cannot read', () => {
    expect(parseRetryAfterMs(undefined, now)).toBeUndefined();
    expect(parseRetryAfterMs('soon', now)).toBeUndefined();
    expect(parseRetryAfterMs('-3', now)).toBeUndefined();
  });

  it('treats a date in the past as now', () => {
    expect(parseRetryAfterMs('Fri, 02 Oct 2026 08:59:00 GMT', now)).toBe(0);
  });
});

/** A request the way superagent exposes one: method, url, thenable. */
const request = (method: string, outcome: () => Promise<unknown>) => ({
  method,
  url: 'https://api.fractal.cloud/environments/Personal/o/dev?token=x',
  then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    outcome().then(resolve, reject),
});

const fast = {initialDelayMs: 1, maxDelayMs: 2, maxElapsedMs: 5_000, quiet: false};
const cfg = (retry: unknown = fast) =>
  ({clientId: 'cid', clientSecret: 'client-secret', retry}) as Parameters<
    typeof send
  >[0];

describe('send with retries', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('repeats a GET through a brief outage, with a fresh request each time', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation(l => lines.push(String(l)));
    const outcomes = [httpError(503), networkError('ECONNRESET'), undefined];
    const factory = vi.fn(() =>
      request('GET', () => {
        const next = outcomes.shift();
        return next === undefined
          ? Promise.resolve({status: 200, body: {ok: true}})
          : Promise.reject(next);
      }),
    );

    const res = await send(cfg(), factory);

    expect(res).toEqual({status: 200, body: {ok: true}});
    expect(factory).toHaveBeenCalledTimes(3);
    expect(lines).toHaveLength(2);
    // The canonical wait-mode line: ISO timestamp, padded level, message, fields.
    expect(lines[0]).toMatch(
      /^\[\d{4}-\d\d-\d\dT[\d:.]+Z\] WARN {2}Control plane unavailable, retrying {2}method=GET path=\/environments\/Personal\/o\/dev cause=503 attempt=1 retryInMs=\d+ elapsed=\d+s$/,
    );
    expect(lines[1]).toMatch(/cause=ECONNRESET attempt=2/);
    expect(lines.join('\n')).not.toMatch(/token=x|client-secret/);
  });

  it('does not repeat a POST the server may have acted on', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const factory = vi.fn(() =>
      request('POST', () => Promise.reject(httpError(502))),
    );

    const err = await send(cfg(), factory).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(FractalApiError);
    expect((err as FractalApiError).status).toBe(502);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('repeats a POST refused by a draining control plane', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const outcomes = [httpError(503, {body: {reasonCode: 'ServiceDraining'}})];
    const factory = vi.fn(() =>
      request('POST', () => {
        const next = outcomes.shift();
        return next === undefined
          ? Promise.resolve({status: 202})
          : Promise.reject(next);
      }),
    );

    expect(await send(cfg(), factory)).toEqual({status: 202});
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('gives up when the time budget is spent, with the last error, sanitized', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const factory = vi.fn(() =>
      request('GET', () =>
        Promise.reject(httpError(503, {text: 'echo client-secret'})),
      ),
    );

    const started = Date.now();
    const err = await send(
      cfg({initialDelayMs: 5, maxDelayMs: 10, maxElapsedMs: 100}),
      factory,
    ).catch((e: unknown) => e);

    expect(Date.now() - started).toBeLessThan(2_000);
    expect(err).toBeInstanceOf(FractalApiError);
    expect((err as FractalApiError).status).toBe(503);
    expect(String((err as FractalApiError).responseBody)).not.toContain(
      'client-secret',
    );
    expect(factory.mock.calls.length).toBeGreaterThan(1);
  });

  it('honors Retry-After over its own shorter backoff', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const outcomes = [httpError(503, {headers: {'retry-after': '1'}})];
    const factory = () =>
      request('GET', () => {
        const next = outcomes.shift();
        return next === undefined
          ? Promise.resolve({status: 200})
          : Promise.reject(next);
      });

    const started = Date.now();
    await send(cfg(), factory);

    expect(Date.now() - started).toBeGreaterThanOrEqual(950);
  });

  it('does not wait past its budget for a long Retry-After', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const factory = vi.fn(() =>
      request('GET', () =>
        Promise.reject(httpError(503, {headers: {'retry-after': '3600'}})),
      ),
    );

    const started = Date.now();
    await expect(send(cfg(), factory)).rejects.toBeInstanceOf(FractalApiError);
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('can be switched off', async () => {
    const factory = vi.fn(() =>
      request('GET', () => Promise.reject(httpError(503))),
    );

    await expect(send(cfg(false), factory)).rejects.toBeInstanceOf(
      FractalApiError,
    );
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('logs nothing outside a logging operation by default', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation(l => lines.push(String(l)));
    const outcomes = [httpError(504)];
    const factory = () =>
      request('GET', () => {
        const next = outcomes.shift();
        return next === undefined
          ? Promise.resolve({status: 200})
          : Promise.reject(next);
      });

    await send(cfg({initialDelayMs: 1, maxDelayMs: 2}), factory);

    expect(lines).toHaveLength(0);
  });

  it('sanitizes a factory that throws while building the request', async () => {
    const err = await send(cfg(), () => {
      throw Object.assign(new Error('bad header client-secret'), {status: undefined});
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(FractalApiError);
    expect(String((err as Error).message)).not.toContain('client-secret');
  });

  it('logs nothing when quiet', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation(l => lines.push(String(l)));
    const outcomes = [httpError(504)];
    const factory = () =>
      request('GET', () => {
        const next = outcomes.shift();
        return next === undefined
          ? Promise.resolve({status: 200})
          : Promise.reject(next);
      });

    await send(cfg({...fast, quiet: true}), factory);

    expect(lines).toHaveLength(0);
  });

  it('still accepts a plain request, which it cannot repeat', async () => {
    const err = await send(
      cfg(),
      request('GET', () => Promise.reject(httpError(503))),
    ).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(FractalApiError);
  });
});
