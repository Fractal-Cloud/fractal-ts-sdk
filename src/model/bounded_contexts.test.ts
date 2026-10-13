/**
 * bounded_contexts.test.ts — cloud.boundedContexts with a mocked HTTP client.
 *
 * A Bounded Context is what the control plane's accounts API still calls a
 * "resource group": personal ones under `/accounts/me/resourcegroups`, an
 * organization's under `/organizations/{id}/resourcegroups`. Proves the
 * requests (method, URL, credentials, body), the mapping of the answers, a
 * missing Bounded Context, and the refusals made before anything is sent.
 */
import {describe, it, expect, beforeEach, vi} from 'vitest';

const h = vi.hoisted(() => {
  const requests: {
    method: string;
    url: string;
    body?: unknown;
    headers: Record<string, string>;
  }[] = [];
  const state = {queue: [] as {status: number; body?: unknown}[]};
  return {requests, state};
});

vi.mock('superagent', () => {
  const make = (method: string, url: string) => {
    const req: Record<string, unknown> = {body: undefined, headers: {}};
    let okFn: (r: {status: number}) => boolean = r => r.status < 300;
    req.ok = (f: (r: {status: number}) => boolean) => {
      okFn = f;
      return req;
    };
    req.set = (headers: Record<string, string>) => {
      Object.assign(req.headers as Record<string, string>, headers);
      return req;
    };
    req.send = (b: unknown) => {
      req.body = b;
      return req;
    };
    req.then = (
      resolve: (v: unknown) => unknown,
      reject: (e: unknown) => unknown,
    ) => {
      h.requests.push({
        method,
        url,
        body: req.body,
        headers: {...(req.headers as Record<string, string>)},
      });
      const next = h.state.queue.shift() ?? {status: 200, body: {}};
      if (!okFn(next)) {
        const err = Object.assign(new Error(`HTTP ${next.status}`), {
          status: next.status,
          response: {status: next.status, body: next.body},
        });
        return Promise.reject(err).then(resolve, reject);
      }
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

import {createFractalCloudClient} from './client';

const cloud = createFractalCloudClient({
  clientId: 'cid',
  clientSecret: 'secret',
});
const ORG = '2e114308-14ec-4d77-b610-490324fa1844';
const ME = '7c0e1f2a-3b4c-4d5e-8f90-a1b2c3d4e5f6';
const API = 'https://api.fractal.cloud';

const answer = (
  type: 'Personal' | 'Organizational',
  ownerId: string,
  shortName: string,
) => ({
  id: {resourceGroupType: type, ownerId, shortName},
  displayName: 'Payments',
  description: 'Everything that moves money',
  status: 'Active',
  icon: null,
  livesystems: [`${type}/${ownerId}/${shortName}/checkout`],
  fractals: [],
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
});

const mapped = (
  type: 'Personal' | 'Organizational',
  ownerId: string,
  shortName: string,
) => ({
  id: {type, ownerId, shortName},
  qualifiedId: `${type}/${ownerId}/${shortName}`,
  displayName: 'Payments',
  description: 'Everything that moves money',
  status: 'Active',
  icon: null,
  liveSystemIds: [`${type}/${ownerId}/${shortName}/checkout`],
  fractalIds: [],
});

describe('cloud.boundedContexts', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  it("creates an organization's Bounded Context", async () => {
    h.state.queue = [
      {status: 200, body: answer('Organizational', ORG, 'payments')},
    ];
    const created = await cloud.boundedContexts.create({
      type: 'Organizational',
      ownerId: ORG,
      shortName: 'payments',
      displayName: 'Payments',
      description: 'Everything that moves money',
    });
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0]).toMatchObject({
      method: 'POST',
      url: `${API}/organizations/${ORG}/resourcegroups/payments`,
      body: {
        displayName: 'Payments',
        description: 'Everything that moves money',
      },
    });
    expect(h.requests[0].headers['X-ClientID']).toBe('cid');
    expect(h.requests[0].headers['X-ClientSecret']).toBe('secret');
    expect(created).toEqual(mapped('Organizational', ORG, 'payments'));
  });

  it("creates the caller's personal Bounded Context, sending only what is set", async () => {
    h.state.queue = [{status: 200, body: answer('Personal', ME, 'sandbox')}];
    const created = await cloud.boundedContexts.create({
      type: 'Personal',
      shortName: 'sandbox',
      displayName: 'Payments',
    });
    expect(h.requests[0]).toMatchObject({
      method: 'POST',
      url: `${API}/accounts/me/resourcegroups/sandbox`,
      body: {displayName: 'Payments'},
    });
    expect(created.qualifiedId).toBe(`Personal/${ME}/sandbox`);
  });

  it('gets one Bounded Context, and null when there is none', async () => {
    h.state.queue = [
      {status: 200, body: answer('Organizational', ORG, 'payments')},
      {status: 404},
    ];
    const owner = {type: 'Organizational', ownerId: ORG} as const;
    expect(await cloud.boundedContexts.get(owner, 'payments')).toEqual(
      mapped('Organizational', ORG, 'payments'),
    );
    expect(await cloud.boundedContexts.get(owner, 'missing')).toBeNull();
    expect(h.requests.map(r => [r.method, r.url])).toEqual([
      ['GET', `${API}/organizations/${ORG}/resourcegroups/payments`],
      ['GET', `${API}/organizations/${ORG}/resourcegroups/missing`],
    ]);
  });

  it('lists an owner’s Bounded Contexts', async () => {
    h.state.queue = [
      {
        status: 200,
        body: [answer('Personal', ME, 'a'), answer('Personal', ME, 'b')],
      },
      {status: 200, body: []},
    ];
    const mine = await cloud.boundedContexts.list({type: 'Personal'});
    expect(mine.map(bc => bc.qualifiedId)).toEqual([
      `Personal/${ME}/a`,
      `Personal/${ME}/b`,
    ]);
    expect(
      await cloud.boundedContexts.list({
        type: 'Organizational',
        ownerId: ORG,
      }),
    ).toEqual([]);
    expect(h.requests.map(r => [r.method, r.url])).toEqual([
      ['GET', `${API}/accounts/me/resourcegroups`],
      ['GET', `${API}/organizations/${ORG}/resourcegroups`],
    ]);
  });

  it('deletes a Bounded Context', async () => {
    h.state.queue = [{status: 200}];
    await cloud.boundedContexts.delete(
      {type: 'Organizational', ownerId: ORG},
      'payments',
    );
    expect(h.requests.map(r => [r.method, r.url])).toEqual([
      ['DELETE', `${API}/organizations/${ORG}/resourcegroups/payments`],
    ]);
  });

  it('percent-encodes the short name', async () => {
    h.state.queue = [{status: 404}];
    await cloud.boundedContexts.get({type: 'Personal'}, '../x');
    expect(h.requests[0].url).toBe(`${API}/accounts/me/resourcegroups/..%2Fx`);
  });

  it('refuses what the control plane would, without calling it', async () => {
    await expect(
      cloud.boundedContexts.list({type: 'Organizational', ownerId: ' '}),
    ).rejects.toThrow('requires the ownerId of the organization');
    await expect(
      cloud.boundedContexts.get(
        {type: 'Organizational', ownerId: 'acme'},
        'payments',
      ),
    ).rejects.toThrow("ownerId must be the organization's GUID, got 'acme'");
    await expect(
      cloud.boundedContexts.create({
        type: 'Personal',
        shortName: ' ',
        displayName: 'x',
      }),
    ).rejects.toThrow('requires a shortName');
    await expect(
      cloud.boundedContexts.create({
        type: 'Personal',
        shortName: 'sandbox',
        displayName: ' ',
      }),
    ).rejects.toThrow('requires a displayName');
    expect(h.requests).toHaveLength(0);
  });

  it('refuses an answer it cannot map', async () => {
    h.state.queue = [{status: 200, body: [{displayName: 'no id'}]}];
    await expect(
      cloud.boundedContexts.list({type: 'Personal'}),
    ).rejects.toThrow(
      'Unexpected response from GET /accounts/me/resourcegroups: [0].id is not a Bounded Context id',
    );
  });

  it('surfaces a refusal as an error that carries no credential', async () => {
    h.state.queue = [{status: 403, body: {message: 'denied'}}];
    const err = await cloud.boundedContexts
      .delete({type: 'Personal'}, 'sandbox')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(JSON.stringify(err)).not.toContain('secret');
    expect(String(err)).not.toContain('secret');
  });
});
