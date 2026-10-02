/**
 * client_retry.test.ts — a client call rides out a control-plane restart.
 *
 * The mocked request carries `method` and `url` the way a superagent Request
 * does, which is what the retry policy reads to decide whether a repeat is safe.
 */
import {afterEach, describe, expect, it, vi} from 'vitest';

const h = vi.hoisted(() => {
  const requests: {method: string; url: string}[] = [];
  const state = {queue: [] as {status?: number; body?: unknown; throws?: unknown}[]};
  return {requests, state};
});

vi.mock('superagent', () => {
  const make = (method: string, url: string) => {
    const req: Record<string, unknown> = {method, url};
    req.ok = () => req;
    req.set = () => req;
    req.send = () => req;
    req.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
      h.requests.push({method, url});
      const next = h.state.queue.shift() ?? {status: 200, body: {}};
      return next.throws === undefined
        ? Promise.resolve(next).then(resolve, reject)
        : Promise.reject(next.throws).then(resolve, reject);
    };
    return req;
  };
  return {
    default: {
      get: (u: string) => make('GET', u),
      post: (u: string) => make('POST', u),
      put: (u: string) => make('PUT', u),
      delete: (u: string) => make('DELETE', u),
    },
  };
});

import {createFractalCloudClient} from './client';
import {FractalApiError} from './api-error';

const OWNER = '00000000-0000-0000-0000-000000000001';
const unavailable = (text = 'no healthy upstream') =>
  Object.assign(new Error('Service Unavailable'), {
    status: 503,
    response: {status: 503, headers: {}, text},
  });

const cloud = (retry: unknown = {initialDelayMs: 1, maxDelayMs: 2}) =>
  createFractalCloudClient({
    clientId: 'cid',
    clientSecret: 'secret',
    retry: retry as never,
  });

describe('client calls through a control-plane restart', () => {
  afterEach(() => {
    h.requests.length = 0;
    h.state.queue.length = 0;
    vi.restoreAllMocks();
  });

  it('environments.get repeats the GET until the control plane is back', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation(l => lines.push(String(l)));
    h.state.queue.push(
      {throws: unavailable()},
      {throws: unavailable()},
      {status: 200, body: {id: {type: 'Personal', ownerId: OWNER, shortName: 'dev'}, name: 'dev'}},
    );

    const env = await cloud().environments.get({
      type: 'Personal',
      ownerId: OWNER,
      shortName: 'dev',
    });

    expect(env).not.toBeNull();
    expect(h.requests.map(r => r.method)).toEqual(['GET', 'GET', 'GET']);
    expect(lines.filter(l => / WARN {2}Control plane unavailable, retrying/.test(l))).toHaveLength(2);
  });

  it('gives up with a FractalApiError when retries are off', async () => {
    h.state.queue.push({throws: unavailable()});

    await expect(
      cloud(false).environments.get({type: 'Personal', ownerId: OWNER, shortName: 'dev'}),
    ).rejects.toBeInstanceOf(FractalApiError);
    expect(h.requests).toHaveLength(1);
  });
});
