/**
 * service.test.ts — deploy() unit tests with a mocked HTTP client.
 *
 * Proves the API contract WITHOUT a live API: payload shape (blueprintMap keyed
 * by component id, links as {componentId,settings}, environment.id), create-vs-
 * update selection, wait-mode polling to Active, failure propagation, and
 * fire-and-forget (submit without polling).
 */
import {describe, it, expect, beforeEach, vi} from 'vitest';

const h = vi.hoisted(() => {
  const requests: {method: string; url: string; body?: unknown}[] = [];
  const state = {queue: [] as {status: number; body?: unknown}[]};
  return {requests, state};
});

vi.mock('superagent', () => {
  const make = (method: string, url: string) => {
    const req: Record<string, unknown> = {body: undefined};
    req.ok = () => req;
    req.set = () => req;
    req.send = (b: unknown) => {
      req.body = b;
      return req;
    };
    req.then = (
      resolve: (v: unknown) => unknown,
      reject: (e: unknown) => unknown,
    ) => {
      h.requests.push({method, url, body: req.body});
      const next = h.state.queue.shift() ?? {status: 200, body: {}};
      return Promise.resolve(next).then(resolve, reject);
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

import {createFractal} from './core';
import {ObjectStorage} from './components/storage';
import {AwsS3} from './offers/storage';
import {deploy} from './service';

const creds = {clientId: 'cid', clientSecret: 'secret'};

function liveSystem() {
  return createFractal({
    id: 'basic-storage',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId: {
      ownerType: 'Personal',
      ownerId: '00000000-0000-0000-0000-000000000001',
      name: 'reusable-templates',
    },
    blueprint: bp => ({
      uploads: bp.add(ObjectStorage({id: 'uploads'}).withEncryption('at-rest')),
    }),
  }).toLiveSystem({
    name: 'acme-storage',
    environment: {
      ownerType: 'Personal',
      ownerId: '00000000-0000-0000-0000-000000000001',
      name: 'dev',
    },
    select: {uploads: AwsS3({bucketRegion: 'us-east-1'})},
  });
}

describe('deploy()', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  it('fire-and-forget: creates (POST) and returns without polling', async () => {
    h.state.queue = [{status: 404}, {status: 201}];
    await deploy(liveSystem(), creds); // default mode

    const methods = h.requests.map(r => r.method);
    expect(methods).toEqual(['GET', 'POST']); // existence check + create, no status poll
    const post = h.requests.find(r => r.method === 'POST')!;
    expect(post.url).toBe('https://api.fractal.cloud/livesystems');
    const body = post.body as {
      liveSystemId: string;
      fractalId: string;
      blueprintMap: Record<
        string,
        {type: string; provider: string; parameters: Record<string, unknown>}
      >;
      environment: {id: {type: string; ownerId: string; shortName: string}};
    };
    expect(body.liveSystemId).toBe(
      'Personal/00000000-0000-0000-0000-000000000001/reusable-templates/acme-storage',
    );
    expect(body.fractalId).toBe(
      'Personal/00000000-0000-0000-0000-000000000001/reusable-templates/basic-storage:1.0.0',
    );
    // payload keyed by component id, carrying offer type + flowed guardrail param
    expect(body.blueprintMap.uploads.type).toBe('Storage.PaaS.S3');
    expect(body.blueprintMap.uploads.provider).toBe('AWS');
    expect(body.blueprintMap.uploads.parameters.encryption).toBe('at-rest');
    expect(body.environment.id).toEqual({
      type: 'Personal',
      ownerId: '00000000-0000-0000-0000-000000000001',
      shortName: 'dev',
    });
  });

  it('wait: submits then polls until Active', async () => {
    h.state.queue = [
      {status: 404}, // existence
      {status: 201}, // create
      {status: 200, body: {status: 'Provisioning'}}, // poll 1
      {status: 200, body: {status: 'Active'}}, // poll 2
    ];
    await deploy(liveSystem(), creds, {
      mode: 'wait',
      quiet: true,
      pollIntervalMs: 1,
      timeoutMs: 5000,
    });
    const methods = h.requests.map(r => r.method);
    expect(methods).toEqual(['GET', 'POST', 'GET', 'GET']);
  });

  it('wait: throws on terminal failure status', async () => {
    h.state.queue = [
      {status: 404},
      {status: 201},
      {status: 200, body: {status: 'FailedMutation'}},
    ];
    await expect(
      deploy(liveSystem(), creds, {
        mode: 'wait',
        quiet: true,
        pollIntervalMs: 1,
        timeoutMs: 5000,
      }),
    ).rejects.toThrow(/failed with status: FailedMutation/);
  });

  it('updates (PUT) when the live system already exists', async () => {
    h.state.queue = [{status: 200}, {status: 200}]; // existence 200 → PUT
    await deploy(liveSystem(), creds);
    const methods = h.requests.map(r => r.method);
    expect(methods).toEqual(['GET', 'PUT']);
    const put = h.requests.find(r => r.method === 'PUT')!;
    expect(put.url).toBe(
      'https://api.fractal.cloud/livesystems/Personal/00000000-0000-0000-0000-000000000001/reusable-templates/acme-storage',
    );
  });
});
