/**
 * service.test.ts — LiveSystem operations with a mocked HTTP client.
 *
 * Proves the API contract WITHOUT a live API: payload shape (blueprintMap keyed
 * by component id, links as {componentId,settings}, environment.id), create-vs-
 * update selection, wait-mode polling to Active, failure propagation, and
 * fire-and-forget (submit without polling).
 *
 * Blueprint registration is a SEPARATE entity operation and is specified in
 * client.test.ts — nothing here should ever touch `/blueprints`.
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
import {createFractalCloudClient} from './client';

const cloud = createFractalCloudClient({
  clientId: 'cid',
  clientSecret: 'secret',
});
const OWNER = '00000000-0000-0000-0000-000000000001';
const LS_URL = `https://api.fractal.cloud/livesystems/Personal/${OWNER}/reusable-templates/acme-storage`;

function liveSystem() {
  return createFractal({
    id: 'basic-storage',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId: {
      ownerType: 'Personal',
      ownerId: OWNER,
      name: 'reusable-templates',
    },
    blueprint: bp => ({
      uploads: bp.add(ObjectStorage({id: 'uploads'}).withEncryption('at-rest')),
    }),
  }).toLiveSystem({
    name: 'acme-storage',
    environment: {ownerType: 'Personal', ownerId: OWNER, name: 'dev'},
    select: {uploads: AwsS3({region: 'us-east-1'})},
  });
}

describe('liveSystems.deploy()', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  it('fire-and-forget: creates (POST) and returns without polling', async () => {
    h.state.queue = [{status: 404}, {status: 201}];
    await cloud.liveSystems.deploy(liveSystem()); // default mode

    const methods = h.requests.map(r => r.method);
    expect(methods).toEqual(['GET', 'POST']); // existence probe + create, no poll
    const post = h.requests.find(
      r =>
        r.method === 'POST' &&
        r.url === 'https://api.fractal.cloud/livesystems',
    )!;
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
      `Personal/${OWNER}/reusable-templates/acme-storage`,
    );
    expect(body.fractalId).toBe(
      `Personal/${OWNER}/reusable-templates/basic-storage:1.0.0`,
    );
    // payload keyed by component id, carrying the RESOLVED offer + flowed guardrail
    expect(body.blueprintMap.uploads.type).toBe('Storage.PaaS.AwsS3');
    expect(body.blueprintMap.uploads.provider).toBe('AWS');
    expect(body.blueprintMap.uploads.parameters.encryption).toBe('at-rest');
    expect(body.environment.id).toEqual({
      type: 'Personal',
      ownerId: OWNER,
      shortName: 'dev',
    });
  });

  it('wait: submits, polls until Active, and resolves to the LiveSystem state', async () => {
    h.state.queue = [
      {status: 404}, // LS existence
      {status: 201}, // LS create
      {status: 200, body: {status: 'Provisioning'}}, // poll 1
      {status: 200, body: {status: 'Active'}}, // poll 2
      {
        status: 200,
        body: {
          status: 'Active',
          components: [
            {
              id: 'uploads',
              status: 'Active',
              outputFields: {privateIp: '10.0.0.5', sshPort: '22'},
            },
          ],
        },
      }, // wait-resolve: read output fields
    ];
    const state = await cloud.liveSystems.deploy(liveSystem(), {
      mode: 'wait',
      quiet: true,
      pollIntervalMs: 1,
      timeoutMs: 5000,
    });
    expect(h.requests.map(r => r.method)).toEqual([
      'GET',
      'POST',
      'GET',
      'GET',
      'GET',
    ]);
    expect(state?.status).toBe('Active');
    expect(state?.components.uploads.outputFields).toEqual({
      privateIp: '10.0.0.5',
      sshPort: '22',
    });
  });

  it('outputs: reads per-component output fields (vendor-neutral shape)', async () => {
    h.state.queue = [
      {
        status: 200,
        body: {
          status: 'Active',
          components: [
            {
              id: 'vllm-host',
              status: 'Active',
              // numbers coerce to strings so the typed Record<string,string> holds
              outputFields: {privateIp: '10.0.1.9', sshPort: 22, publicIp: ''},
            },
          ],
        },
      },
    ];
    const state = await cloud.liveSystems.outputs(liveSystem());
    expect(state.status).toBe('Active');
    expect(state.components['vllm-host'].status).toBe('Active');
    expect(state.components['vllm-host'].outputFields).toEqual({
      privateIp: '10.0.1.9',
      sshPort: '22',
      publicIp: '',
    });
    expect(h.requests.map(r => r.method)).toEqual(['GET']);
  });

  it('wait: throws on terminal failure status', async () => {
    h.state.queue = [
      {status: 404}, // LS existence
      {status: 201}, // LS create
      {status: 200, body: {status: 'FailedMutation'}}, // poll
    ];
    await expect(
      cloud.liveSystems.deploy(liveSystem(), {
        mode: 'wait',
        quiet: true,
        pollIntervalMs: 1,
        timeoutMs: 5000,
      }),
    ).rejects.toThrow(/failed with status: FailedMutation/);
  });

  it('updates (PUT) when the live system already exists', async () => {
    h.state.queue = [{status: 200}, {status: 200}];
    await cloud.liveSystems.deploy(liveSystem());
    expect(h.requests.map(r => `${r.method} ${r.url}`)).toEqual([
      `GET ${LS_URL}`,
      `PUT ${LS_URL}`,
    ]);
  });

  it('destroy: deletes the live system and leaves its blueprint registered', async () => {
    h.state.queue = [{status: 202}];
    await cloud.liveSystems.destroy(liveSystem());
    expect(h.requests.map(r => `${r.method} ${r.url}`)).toEqual([
      `DELETE ${LS_URL}`,
    ]);
  });
});
