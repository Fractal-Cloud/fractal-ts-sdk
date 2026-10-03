/**
 * environment_plan.test.ts — cloud.environments.plan(): what a deploy would
 * create (+), update (~) or leave alone (=), read-only, with the order of an
 * environment's agents ignored, and the markdown a CI step summary shows.
 */
import {describe, it, expect, beforeEach, vi} from 'vitest';

const h = vi.hoisted(() => {
  const requests: {method: string; url: string}[] = [];
  const server = {
    environments: new Map<string, Record<string, unknown>>(),
    initializedClouds: new Map<string, string[]>(),
  };
  const answer = (method: string, url: string) => {
    const path = new URL(url).pathname.split('/').filter(s => s.length > 0);
    if (method !== 'GET') {
      return {status: 500};
    }
    if (path.length === 3) {
      return {
        status: 200,
        body: [...server.environments.entries()].map(([name, e]) => ({
          id: e.id,
          name: e.name,
          status: e.status,
          resourceGroups: e.resourceGroups,
          initializedClouds: server.initializedClouds.get(name) ?? [],
        })),
      };
    }
    const stored = server.environments.get(path[3]);
    return stored ? {status: 200, body: stored} : {status: 404};
  };
  return {requests, server, answer};
});

vi.mock('superagent', () => {
  const make = (method: string, url: string) => {
    const req: Record<string, unknown> = {};
    req.ok = () => req;
    req.set = () => req;
    req.send = () => req;
    req.then = (
      resolve: (v: unknown) => unknown,
      reject: (e: unknown) => unknown,
    ) => {
      h.requests.push({method, url});
      return Promise.resolve(h.answer(method, url)).then(resolve, reject);
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

import {
  ManagementEnvironment,
  OperationalEnvironment,
  environmentPlanMarkdown,
  formatEnvironmentPlan,
  resolveEnvironment,
} from './environment/index';
import {createFractalCloudClient} from './client';

const cloud = createFractalCloudClient({clientId: 'cid', clientSecret: 'cs'});
const OWNER = '2e114308-14ec-4d77-b610-490324fa1844';
const rg = (name: string) => `Organizational/${OWNER}/${name}`;

const mgmt = () =>
  ManagementEnvironment({
    id: {type: 'Organizational', ownerId: OWNER, shortName: 'mgmt'},
    name: 'Mgmt',
    resourceGroups: [rg('rg')],
  })
    .withAwsCloudAgent({
      region: 'eu-central-1',
      organizationId: 'o-abc',
      accountId: '111111111111',
    })
    .withGcpCloudAgent({
      region: 'europe-west3',
      organizationId: '42',
      projectId: 'proj-1',
    })
    .withNetworkTier('nonprod');

const store = (
  shortName: string,
  overrides: Record<string, unknown> = {},
  parameters?: Record<string, unknown>,
) => {
  const tree = resolveEnvironment(mgmt());
  h.server.environments.set(shortName, {
    id: {type: 'Organizational', ownerId: OWNER, shortName},
    managementEnvironmentId: null,
    name: 'Mgmt',
    resourceGroups: [rg('rg')],
    parameters: parameters ?? tree.management.parameters,
    status: 'Active',
    ...overrides,
  });
};

beforeEach(() => {
  h.requests.length = 0;
  h.server.environments.clear();
  h.server.initializedClouds.clear();
});

describe('cloud.environments.plan()', () => {
  it('plans a create for an absent or deleted environment', async () => {
    const plan = await cloud.environments.plan(mgmt());
    expect(plan.entries).toEqual([
      expect.objectContaining({
        environment: expect.objectContaining({shortName: 'mgmt'}),
        action: 'create',
      }),
    ]);
    store('mgmt', {status: 'Deleted'});
    const again = await cloud.environments.plan(mgmt());
    expect(again.entries[0].action).toBe('create');
  });

  it('reports an unchanged environment with its status and initialized clouds', async () => {
    store('mgmt');
    h.server.initializedClouds.set('mgmt', ['Aws']);
    const plan = await cloud.environments.plan(mgmt());
    expect(plan.entries[0]).toMatchObject({
      action: 'unchanged',
      changes: [],
      status: 'Active',
      initializedClouds: ['Aws'],
    });
    expect(plan.refused).toBe(false);
  });

  it('ignores the order of the agents', async () => {
    const declared = resolveEnvironment(mgmt()).management.parameters;
    store(
      'mgmt',
      {},
      {
        ...declared,
        agents: [...(declared.agents as unknown[])].reverse(),
      },
    );
    const plan = await cloud.environments.plan(mgmt());
    expect(plan.entries[0].action).toBe('unchanged');
  });

  it('names what an update would change, field by field', async () => {
    store('mgmt', {name: 'Old name'}, {networkTier: 'prod', keptByServer: 1});
    const plan = await cloud.environments.plan(mgmt());
    expect(plan.entries[0].action).toBe('update');
    expect(plan.entries[0].changes).toEqual([
      'name',
      'parameters.networkTier',
      'parameters.agents',
    ]);
  });

  it('reports a DNS zone switching between strict and lax as a dnsZones change', async () => {
    const declare = (recordManagement: 'strict' | 'lax') =>
      mgmt().withDnsZones([{name: 'fractal.cloud', recordManagement}]);
    store('mgmt', {}, resolveEnvironment(declare('strict')).management.parameters);
    const same = await cloud.environments.plan(declare('strict'));
    expect(same.entries[0].action).toBe('unchanged');
    const plan = await cloud.environments.plan(declare('lax'));
    expect(plan.entries[0].action).toBe('update');
    expect(plan.entries[0].changes).toEqual(['parameters.dnsZones']);
  });

  it('refuses an operational tier the stored management tier would override', async () => {
    store(
      'mgmt',
      {},
      {
        ...resolveEnvironment(mgmt()).management.parameters,
        networkTier: 'prod',
      },
    );
    const tree = ManagementEnvironment({
      id: {type: 'Organizational', ownerId: OWNER, shortName: 'mgmt'},
      name: 'Mgmt',
      resourceGroups: [rg('rg')],
    }).withOperationalEnvironment(
      OperationalEnvironment({
        shortName: 'op',
        resourceGroups: [rg('rg')],
      }).withNetworkTier('nonprod'),
    );
    const plan = await cloud.environments.plan(tree);
    expect(plan.refused).toBe(true);
    expect(
      plan.entries.find(e => e.environment.shortName === 'op'),
    ).toMatchObject({
      action: 'refused',
      message: expect.stringMatching(/'nonprod'.*'prod'/),
    });
  });

  it('plans several trees, each environment once, and only reads', async () => {
    store('mgmt');
    const plan = await cloud.environments.plan([mgmt(), mgmt()]);
    expect(plan.entries).toHaveLength(1);
    expect(h.requests.every(r => r.method === 'GET')).toBe(true);
  });

  it('renders as +/~/= lines and as a step-summary markdown block', async () => {
    store('mgmt', {name: 'Old'});
    h.server.initializedClouds.set('mgmt', ['Aws', 'Gcp']);
    const tree = mgmt().withOperationalEnvironment(
      OperationalEnvironment({shortName: 'op', resourceGroups: [rg('rg')]}),
    );
    const plan = await cloud.environments.plan(tree);
    expect(formatEnvironmentPlan(plan)).toBe(
      '~ update mgmt: name\n+ create op',
    );
    store('mgmt');
    h.server.environments.set('op', {
      ...h.server.environments.get('mgmt')!,
      id: {type: 'Organizational', ownerId: OWNER, shortName: 'op'},
    });
    const unchanged = await cloud.environments.plan(mgmt());
    expect(formatEnvironmentPlan(unchanged)).toBe(
      '= mgmt (Active, initialized: Aws,Gcp)',
    );
    expect(environmentPlanMarkdown(plan)).toBe(
      '## Environments plan\n\n```diff\n~ update mgmt: name\n+ create op\n```\n',
    );
  });
});
