/**
 * environment_deploy_ci.test.ts — the deploy semantics a CI job needs without
 * orchestration code of its own: under fire-and-forget, an agent whose cloud has
 * no credentials in this job is skipped (when asked to) and the others still
 * initialize; an operational agent whose management agent has not completed is
 * skipped with a notice rather than failing the run; and the stored order of an
 * environment's agents never flips between runs.
 *
 * The control plane is a route-based fake, so the tests state what the server
 * holds rather than the exact order of every request.
 */
import {describe, it, expect, beforeEach, vi} from 'vitest';

const h = vi.hoisted(() => {
  type Req = {
    method: string;
    url: string;
    body?: unknown;
    headers: Record<string, string>;
  };
  const requests: Req[] = [];
  const server = {
    /** Stored environments by short name. */
    environments: new Map<string, Record<string, unknown>>(),
    /** Initialization run status by `<shortName>/<provider>`. */
    runs: new Map<string, string>(),
  };
  const answer = (
    method: string,
    url: string,
  ): {status: number; body?: unknown} => {
    const path = new URL(url).pathname.split('/').filter(s => s.length > 0);
    // environments / type / owner / shortName / ...
    const shortName = path[3];
    if (path.length === 3 && method === 'GET') {
      return {
        status: 200,
        body: [...server.environments.values()].map(e => ({
          ...e,
          initializedClouds: [],
        })),
      };
    }
    if (path.length === 4) {
      if (method === 'GET') {
        const stored = server.environments.get(shortName);
        return stored ? {status: 200, body: stored} : {status: 404};
      }
      return {status: method === 'POST' ? 201 : 200};
    }
    if (path[4] === 'initializer') {
      const key = `${shortName}/${path[5]}`;
      if (path[6] === 'status') {
        const status = server.runs.get(key);
        return status === undefined
          ? {status: 404}
          : {status: 200, body: {initializationRun: {status}}};
      }
      return {status: 202};
    }
    return {status: 201};
  };
  return {requests, server, answer};
});

vi.mock('superagent', () => {
  const make = (method: string, url: string) => {
    const req: Record<string, unknown> = {body: undefined, headers: {}};
    req.ok = () => req;
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
  ProviderCredentialsNotConfigured,
  type ProviderCredentials,
  type ProviderCredentialsRequest,
} from './environment/index';
import type {CiReporter} from './ci/index';
import {createFractalCloudClient} from './client';

const cloud = createFractalCloudClient({clientId: 'cid', clientSecret: 'cs'});
const OWNER = '2e114308-14ec-4d77-b610-490324fa1844';
const rg = (name: string) => `Organizational/${OWNER}/${name}`;

/** shared-management-1's shape: one environment, agents on three clouds. */
const threeClouds = () =>
  ManagementEnvironment({
    id: {type: 'Organizational', ownerId: OWNER, shortName: 'mgmt'},
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
    .withAzureCloudAgent({
      region: 'westeurope',
      tenantId: 'tenant-1',
      subscriptionId: 'sub-1',
    });

/** fractal-cloud's shape: an AWS management environment and an operational one. */
const withOperational = () =>
  ManagementEnvironment({
    id: {type: 'Organizational', ownerId: OWNER, shortName: 'mgmt'},
    resourceGroups: [rg('rg')],
  })
    .withAwsCloudAgent({
      region: 'eu-central-1',
      organizationId: 'o-abc',
      accountId: '111111111111',
    })
    .withOperationalEnvironment(
      OperationalEnvironment({
        shortName: 'prod',
        resourceGroups: [rg('rg')],
      }).withAwsAccount({region: 'eu-central-1', accountId: '222222222222'}),
    );

const all: Record<string, ProviderCredentials> = {
  AWS: {aws: {accessKeyId: 'AKIA1', secretAccessKey: 'fixture-secret-access-key', sessionToken: 'fixture-session-token'}},
  GCP: {
    gcp: {
      serviceAccountEmail: 'sa@p.iam.gserviceaccount.com',
      workloadIdentityProvider:
        'projects/1/locations/global/workloadIdentityPools/p/providers/x',
      federatedToken: 'fixture-federated-token',
    },
  },
  AZURE: {azure: {clientId: 'app', federatedToken: 'fixture-federated-token'}},
};

/** A resolver holding credentials for `held` clouds only, as one CI job would. */
const holding =
  (...held: string[]) =>
  (r: ProviderCredentialsRequest): ProviderCredentials => {
    if (!held.includes(r.provider)) {
      throw new ProviderCredentialsNotConfigured(r.provider, r.environment);
    }
    return all[r.provider];
  };

const recordingReporter = () => {
  const notices: string[] = [];
  const reporter: CiReporter = {
    notice: m => notices.push(m),
    warning: m => notices.push(`WARN ${m}`),
    error: m => notices.push(`ERROR ${m}`),
    mask: () => undefined,
    appendSummary: () => undefined,
  };
  return {notices, reporter};
};

const initialized = () =>
  h.requests
    .filter(r => r.url.endsWith('/initialize'))
    .map(r => {
      const p = new URL(r.url).pathname.split('/');
      return `${p[4]}/${p[6]}`;
    });

beforeEach(() => {
  h.requests.length = 0;
  h.server.environments.clear();
  h.server.runs.clear();
});

describe('an agent of a cloud this job holds no credentials for', () => {
  it('is skipped with a notice, and the other agents still initialize', async () => {
    const {notices, reporter} = recordingReporter();
    const result = await cloud.environments.deploy(threeClouds(), {
      quiet: true,
      providerCredentials: holding('AWS', 'AZURE'),
      reporter,
    });
    // GCP is declared between AWS and Azure: the deploy goes on past it.
    expect(initialized()).toEqual(['mgmt/aws', 'mgmt/azure']);
    expect(result.skipped).toEqual([
      {
        environment: {
          type: 'Organizational',
          ownerId: OWNER,
          shortName: 'mgmt',
        },
        provider: 'GCP',
        reason: 'missing-credentials',
        message: expect.stringMatching(/GCP/),
      },
    ]);
    expect(result.started.map(a => a.provider)).toEqual(['AWS', 'AZURE']);
    expect(notices).toEqual([
      expect.stringMatching(
        /Skipped the GCP agent of .*mgmt.*no GCP credentials/,
      ),
    ]);
  });

  it('one job per cloud, each deploying the whole tree, initializes every agent exactly once', async () => {
    for (const held of ['AWS', 'GCP', 'AZURE']) {
      await cloud.environments.deploy(threeClouds(), {
        quiet: true,
        providerCredentials: holding(held),
      });
    }
    expect(initialized()).toEqual(['mgmt/aws', 'mgmt/gcp', 'mgmt/azure']);
  });

  it('still fails on a refusal: an account the job is not configured for is an error', async () => {
    await expect(
      cloud.environments.deploy(threeClouds(), {
        quiet: true,
        providerCredentials: r => {
          if (r.provider === 'GCP') {
            throw new Error("GCP project 'proj-1' is not configured");
          }
          return all[r.provider];
        },
      }),
    ).rejects.toThrow(/proj-1/);
  });

  it('still fails when a resolver returns nothing: only the explicit signal skips', async () => {
    await expect(
      cloud.environments.deploy(threeClouds(), {
        quiet: true,
        providerCredentials: r => (r.provider === 'AWS' ? all.AWS : undefined),
      }),
    ).rejects.toThrow(/GCP.*returned none/);
    expect(initialized()).toEqual(['mgmt/aws']);
  });
});

describe('an operational agent whose management agent has not completed', () => {
  it('is skipped with a notice under fire-and-forget, by default', async () => {
    const {notices, reporter} = recordingReporter();
    const asked: string[] = [];
    const result = await cloud.environments.deploy(withOperational(), {
      quiet: true,
      providerCredentials: r => {
        asked.push(r.environment.shortName);
        return all.AWS;
      },
      reporter,
    });
    expect(initialized()).toEqual(['mgmt/aws']);
    // Its credentials were never minted.
    expect(asked).toEqual(['mgmt']);
    expect(result.skipped).toEqual([
      expect.objectContaining({
        environment: expect.objectContaining({shortName: 'prod'}),
        provider: 'AWS',
        reason: 'pending-management',
      }),
    ]);
    expect(notices).toEqual([
      expect.stringMatching(
        /Skipped the AWS agent of .*prod.*management environment .*mgmt.* not completed.*next deploy/,
      ),
    ]);
    // The operational environment itself was still written.
    expect(
      h.requests.some(r => r.method === 'POST' && r.url.endsWith('/prod')),
    ).toBe(true);
  });

  it("throws when asked to (pendingManagement: 'fail')", async () => {
    await expect(
      cloud.environments.deploy(withOperational(), {
        quiet: true,
        providerCredentials: () => all.AWS,
        pendingManagement: 'fail',
      }),
    ).rejects.toThrow(/agentInit: 'wait'/);
  });

  it('is skipped when the management agent itself was skipped for missing credentials', async () => {
    const asked: string[] = [];
    const result = await cloud.environments.deploy(withOperational(), {
      quiet: true,
      providerCredentials: r => {
        asked.push(r.environment.shortName);
        if (r.tier === 'management') {
          throw new ProviderCredentialsNotConfigured(r.provider, r.environment);
        }
        return all.AWS;
      },
    });
    expect(initialized()).toEqual([]);
    expect(asked).toEqual(['mgmt']);
    expect(
      result.skipped.map(s => [s.environment.shortName, s.reason]),
    ).toEqual([
      ['mgmt', 'missing-credentials'],
      // Not this job's cloud at all: the job holding it initializes both.
      ['prod', 'missing-credentials'],
    ]);
  });

  it('proceeds once the management agent has completed', async () => {
    h.server.runs.set('mgmt/aws', 'Completed');
    const result = await cloud.environments.deploy(withOperational(), {
      quiet: true,
      providerCredentials: () => all.AWS,
    });
    expect(initialized()).toEqual(['prod/aws']);
    expect(result.completed.map(a => a.environment.shortName)).toEqual([
      'mgmt',
    ]);
    expect(result.skipped).toEqual([]);
  });

  it('without a reporter, the notice goes to the deploy log', async () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((m: string) => {
      lines.push(m);
    });
    try {
      await cloud.environments.deploy(withOperational(), {
        providerCredentials: () => all.AWS,
      });
    } finally {
      spy.mockRestore();
    }
    expect(lines.some(l => /Skipped the AWS agent of .*prod/.test(l))).toBe(
      true,
    );
  });
});

describe('review hardening', () => {
  it("a per-cloud job under pendingManagement: 'fail' skips the other clouds rather than throwing", async () => {
    const tree = ManagementEnvironment({
      id: {type: 'Organizational', ownerId: OWNER, shortName: 'mgmt'},
      resourceGroups: [rg('rg')],
    })
      .withAwsCloudAgent({
        region: 'eu-central-1',
        organizationId: 'o-abc',
        accountId: '111111111111',
      })
      .withAzureCloudAgent({
        region: 'westeurope',
        tenantId: 'tenant-1',
        subscriptionId: 'sub-1',
      })
      .withOperationalEnvironment(
        OperationalEnvironment({shortName: 'prod', resourceGroups: [rg('rg')]})
          .withAwsAccount({region: 'eu-central-1', accountId: '222222222222'})
          .withAzureSubscription({region: 'westeurope', subscriptionId: 'sub-2'}),
      );
    h.server.runs.set('mgmt/aws', 'Completed');
    const result = await cloud.environments.deploy(tree, {
      quiet: true,
      providerCredentials: holding('AWS'),
      pendingManagement: 'fail',
    });
    expect(initialized()).toEqual(['prod/aws']);
    expect(
      result.skipped.map(s => [s.environment.shortName, s.provider, s.reason]),
    ).toEqual([
      ['mgmt', 'AZURE', 'missing-credentials'],
      ['prod', 'AZURE', 'missing-credentials'],
    ]);
  });

  it("redacts the deploy's secrets from a resolver's skip message", async () => {
    const {notices, reporter} = recordingReporter();
    const leaked = 'resolver-held-secret-value';
    const result = await cloud.environments.deploy(threeClouds(), {
      quiet: true,
      providerCredentials: r => {
        if (r.provider === 'AWS') {
          return {aws: {accessKeyId: 'AKIA1', secretAccessKey: leaked, sessionToken: 't'}};
        }
        throw new ProviderCredentialsNotConfigured(
          r.provider,
          r.environment,
          `oops ${leaked}`,
        );
      },
      reporter,
    });
    expect(result.skipped).toHaveLength(2);
    for (const n of [...notices, ...result.skipped.map(s => s.message)]) {
      expect(n).not.toContain(leaked);
    }
  });
});

describe("the stored order of an environment's agents", () => {
  const storedWithAgents = (agents: unknown[]) => ({
    id: {type: 'Organizational', ownerId: OWNER, shortName: 'mgmt'},
    name: 'mgmt',
    resourceGroups: [rg('rg')],
    parameters: {agents},
    status: 'Active',
  });

  it('is kept when only the order differs, so nothing is rewritten', async () => {
    // Deploy once to learn what this tree declares, then store it reversed.
    await cloud.environments.deploy(threeClouds(), {
      quiet: true,
      providerCredentials: holding('AWS', 'GCP', 'AZURE'),
    });
    const declared = (
      h.requests.find(r => r.method === 'POST' && r.url.endsWith('/mgmt'))!
        .body as {parameters: {agents: unknown[]}}
    ).parameters.agents;
    h.requests.length = 0;
    h.server.environments.set(
      'mgmt',
      storedWithAgents([...declared].reverse()),
    );
    for (const p of ['aws', 'gcp', 'azure']) {
      h.server.runs.set(`mgmt/${p}`, 'Completed');
    }
    await cloud.environments.deploy(threeClouds(), {
      quiet: true,
      providerCredentials: holding('AWS', 'GCP', 'AZURE'),
    });
    expect(h.requests.filter(r => r.method === 'PUT')).toHaveLength(0);
  });

  it('is replaced by the declared order when the agents themselves changed', async () => {
    h.server.environments.set(
      'mgmt',
      storedWithAgents([{provider: 'AWS', region: 'us-east-1'}]),
    );
    for (const p of ['aws', 'gcp', 'azure']) {
      h.server.runs.set(`mgmt/${p}`, 'Completed');
    }
    await cloud.environments.deploy(threeClouds(), {
      quiet: true,
      providerCredentials: holding('AWS', 'GCP', 'AZURE'),
    });
    const put = h.requests.find(r => r.method === 'PUT');
    const agents = (put!.body as {parameters: {agents: {provider: string}[]}})
      .parameters.agents;
    expect(agents.map(a => a.provider)).toEqual(['AWS', 'GCP', 'AZURE']);
  });
});
