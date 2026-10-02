/**
 * environment_update_agents.test.ts — cloud.environments.updateAgents() with a
 * mocked HTTP client.
 *
 * An agent UPDATE is not a re-initialization: it asks the control plane to
 * re-run the agent's role/permission steps and redeploy it on the latest
 * version (`POST .../initializer/{provider}/update`). These tests prove the
 * request shape, the ordering, the selection of agents, the credential headers,
 * and the wait-mode polling — WITHOUT a live API.
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
    let accept: (r: {status: number}) => boolean = r =>
      r.status >= 200 && r.status < 300;
    req.ok = (fn: (r: {status: number}) => boolean) => {
      accept = fn;
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
      if (!accept(next)) {
        const err = Object.assign(new Error(`HTTP ${next.status}`), {
          status: next.status,
          response: {status: next.status, body: next.body, text: ''},
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

import {
  ManagementEnvironment,
  OperationalEnvironment,
} from './environment/index';
import {createFractalCloudClient} from './client';

const cloud = createFractalCloudClient({
  clientId: 'cid',
  clientSecret: 'secret',
});
const OWNER = '2e114308-14ec-4d77-b610-490324fa1844';
const API = `https://api.fractal.cloud/environments/Organizational/${OWNER}`;
const rg = (name: string) => `Organizational/${OWNER}/${name}`;
const awsCreds = {
  aws: {
    accessKeyId: 'AKIA-mgmt',
    secretAccessKey: 'aws-secret',
    sessionToken: 'aws-session',
  },
};

/** AWS management env (+ GCP agent) with one AWS operational env. */
const tree = () =>
  ManagementEnvironment({
    id: {type: 'Organizational', ownerId: OWNER, shortName: 'mgmt'},
    resourceGroups: [rg('mgmt-rg')],
  })
    .withAwsCloudAgent({
      region: 'eu-central-1',
      organizationId: 'o-abc',
      accountId: '111111111111',
    })
    .withGcpCloudAgent({
      region: 'europe-west1',
      organizationId: 'org-1',
      projectId: 'mgmt-project',
    })
    .withOperationalEnvironments([
      OperationalEnvironment({
        shortName: 'prod',
        resourceGroups: [rg('prod-rg')],
      }).withAwsAccount({region: 'eu-central-1', accountId: '222222222222'}),
    ]);

const run = (status: string, steps: unknown[] = []) => ({
  status: 200,
  body: {initializationRun: {status, steps}},
});
const step = (order: number, resourceName: string, status: string) => ({
  order,
  resourceName,
  resourceType: 'IamRole',
  status,
});

describe('cloud.environments.updateAgents()', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  it('fire-and-forget: POSTs update for every agent, management first, writing no environment', async () => {
    h.state.queue = [{status: 202}, {status: 202}, {status: 202}];
    await cloud.environments.updateAgents(tree(), {quiet: true});

    expect(h.requests.map(r => `${r.method} ${r.url}`)).toEqual([
      `POST ${API}/mgmt/initializer/aws/update`,
      `POST ${API}/mgmt/initializer/gcp/update`,
      `POST ${API}/prod/initializer/aws/update`,
    ]);
    // No provider headers when no credentials were supplied.
    for (const r of h.requests) {
      expect(Object.keys(r.headers).some(k => /^X-(AWS|GCP)/.test(k))).toBe(
        false,
      );
    }
  });

  it('`only` selects the agents to update; the rest are never touched', async () => {
    h.state.queue = [{status: 202}];
    const seen: string[] = [];
    await cloud.environments.updateAgents(tree(), {
      quiet: true,
      only: agent => {
        seen.push(
          `${agent.environment.shortName}:${agent.tier}:${agent.provider}:${agent.accountId}:${agent.region}`,
        );
        return (
          agent.environment.shortName === 'mgmt' && agent.provider === 'AWS'
        );
      },
    });

    expect(seen).toEqual([
      'mgmt:management:AWS:111111111111:eu-central-1',
      'mgmt:management:GCP:mgmt-project:europe-west1',
      'prod:operational:AWS:222222222222:eu-central-1',
    ]);
    expect(h.requests.map(r => `${r.method} ${r.url}`)).toEqual([
      `POST ${API}/mgmt/initializer/aws/update`,
    ]);
  });

  it('static providerCredentials are sent as the same headers initialize uses', async () => {
    h.state.queue = [{status: 202}];
    await cloud.environments.updateAgents(tree(), {
      quiet: true,
      providerCredentials: awsCreds,
      only: a => a.environment.shortName === 'mgmt' && a.provider === 'AWS',
    });

    expect(h.requests).toHaveLength(1);
    expect(h.requests[0].headers).toMatchObject({
      'X-AWS-Access-Key-ID': 'AKIA-mgmt',
      'X-AWS-Secret-Access-Key': 'aws-secret',
      'X-AWS-Session-Token': 'aws-session',
    });
  });

  it('a resolver is asked only for the selected agents, right before each update', async () => {
    h.state.queue = [{status: 202}];
    const asked: string[] = [];
    await cloud.environments.updateAgents(tree(), {
      quiet: true,
      only: a => a.environment.shortName === 'prod',
      providerCredentials: req => {
        asked.push(
          `${req.environment.shortName}:${req.tier}:${req.provider}:${req.accountId}`,
        );
        return {
          aws: {
            accessKeyId: 'AKIA-prod',
            secretAccessKey: 's',
            sessionToken: 't',
          },
        };
      },
    });

    expect(asked).toEqual(['prod:operational:AWS:222222222222']);
    expect(h.requests[0].url).toBe(`${API}/prod/initializer/aws/update`);
    expect(h.requests[0].headers['X-AWS-Access-Key-ID']).toBe('AKIA-prod');
  });

  it('refuses a partial static AWS credential set before sending anything', async () => {
    await expect(
      cloud.environments.updateAgents(tree(), {
        quiet: true,
        providerCredentials: {
          aws: {accessKeyId: 'a', sessionToken: 'b'},
        },
        only: agent => agent.provider === 'AWS',
      }),
    ).rejects.toThrow(/secretAccessKey/);
    expect(h.requests).toHaveLength(0);
  });

  it('an agent whose provider the credentials do not cover is updated without provider headers', async () => {
    h.state.queue = [{status: 202}, {status: 202}, {status: 202}];
    await cloud.environments.updateAgents(tree(), {
      quiet: true,
      providerCredentials: awsCreds,
    });
    const gcp = h.requests.find(r => r.url.endsWith('/gcp/update'));
    expect(gcp).toBeDefined();
    expect(Object.keys(gcp?.headers ?? {}).some(k => /^X-(AWS|GCP|Azure|OCI|Hetzner)/i.test(k))).toBe(
      false,
    );
    expect(
      h.requests.filter(r => r.headers['X-AWS-Access-Key-ID'] === 'AKIA-mgmt'),
    ).toHaveLength(2);
  });

  it('a resolver returning nothing for an agent sends no provider headers', async () => {
    h.state.queue = [{status: 202}];
    await cloud.environments.updateAgents(tree(), {
      quiet: true,
      only: a => a.provider === 'GCP',
      providerCredentials: () => undefined,
    });
    expect(h.requests).toHaveLength(1);
    expect(
      Object.keys(h.requests[0].headers).some(k => /^X-(AWS|GCP|Azure|OCI|Hetzner)/i.test(k)),
    ).toBe(false);
  });

  it('refuses mixed static and federated credentials before sending anything', async () => {
    await expect(
      cloud.environments.updateAgents(tree(), {
        quiet: true,
        providerCredentials: {
          ...awsCreds,
          gcp: {
            serviceAccountEmail: 'sa@p.iam',
            serviceAccountCredentials: '{"k":1}',
            workloadIdentityProvider: 'projects/1/x',
            federatedToken: 'tok',
          } as never,
        },
      }),
    ).rejects.toThrow(/Cloud-agent update for GCP received both static and federated/);
    expect(h.requests).toHaveLength(0);
  });

  it('refuses a provider the control plane cannot update, before sending anything', async () => {
    const hetzner = ManagementEnvironment({
      id: {type: 'Organizational', ownerId: OWNER, shortName: 'mgmt'},
      resourceGroups: [rg('mgmt-rg')],
    })
      .withAwsCloudAgent({
        region: 'eu-central-1',
        organizationId: 'o-abc',
        accountId: '111111111111',
      })
      .withHetznerCloudAgent({region: 'fsn1', projectId: 'p'});
    await expect(
      cloud.environments.updateAgents(hetzner, {quiet: true}),
    ).rejects.toThrow(/HETZNER.*cannot be updated/);
    expect(h.requests).toHaveLength(0);
  });

  it('refuses a selection that matches no agent', async () => {
    await expect(
      cloud.environments.updateAgents(tree(), {quiet: true, only: () => false}),
    ).rejects.toThrow(/no cloud agent/i);
    expect(h.requests).toHaveLength(0);
  });

  it('surfaces the control plane refusing the update (400) and stops', async () => {
    h.state.queue = [
      {status: 400, body: 'An update is already in progress for the Aws agent'},
    ];
    await expect(
      cloud.environments.updateAgents(tree(), {quiet: true}),
    ).rejects.toThrow();
    expect(h.requests).toHaveLength(1);
  });

  it('redacts credentials a refusing control plane quotes back', async () => {
    h.state.queue = [
      {status: 400, body: {message: 'bad session token aws-session (aws-secret)'}},
    ];
    const err = await cloud.environments
      .updateAgents(tree(), {
        quiet: true,
        providerCredentials: awsCreds,
        only: a => a.provider === 'AWS',
      })
      .then(
        () => expect.fail('expected a refusal'),
        (e: unknown) => e,
      );
    const text = `${String(err)} ${JSON.stringify(err)}`;
    expect(text).not.toContain('aws-session');
    expect(text).not.toContain('aws-secret');
  });

  it('wait: ignores the pre-update run, then polls the appended steps to Completed', async () => {
    const before = run('Completed', [
      step(1, 'FractalCloudAgent', 'Completed'),
    ]);
    h.state.queue = [
      before, // pre-update snapshot
      {status: 202}, // update
      before, // stale: the server has not appended the update's steps yet
      run('InProgress', [
        step(1, 'FractalCloudAgent', 'Completed'),
        step(2, 'FractalCloudAgent', 'InProgress'),
      ]),
      run('Completed', [
        step(1, 'FractalCloudAgent', 'Completed'),
        step(2, 'FractalCloudAgent', 'Completed'),
        step(3, 'Update to 1.2.3', 'Completed'),
      ]),
    ];
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await cloud.environments.updateAgents(tree(), {
      agentUpdate: 'wait',
      pollIntervalMs: 1,
      timeoutMs: 5000,
      only: a => a.environment.shortName === 'mgmt' && a.provider === 'AWS',
    });
    const logged = spy.mock.calls.map(c => c.join(' ')).join('\n');
    spy.mockRestore();

    expect(h.requests.map(r => r.method)).toEqual([
      'GET',
      'POST',
      'GET',
      'GET',
      'GET',
    ]);
    expect(h.requests[0].url).toBe(`${API}/mgmt/initializer/aws/status`);
    expect(h.state.queue).toHaveLength(0);
    expect(logged).toMatch(
      /INFO {2}Starting cloud-agent update {2}env=Organizational\/.*\/mgmt provider=AWS/,
    );
    expect(logged).toMatch(/CHECK Polling cloud-agent update .*round=\d+/);
    expect(logged).toMatch(/INFO {2}Cloud-agent update completed .*elapsed=/);
  });

  it('wait: a change that adds no step (a timestamp) is not taken for the update', async () => {
    const before = run('Completed', [step(1, 'FractalCloudAgent', 'Completed')]);
    const touched = {
      status: 200,
      body: {
        initializationRun: {
          status: 'Completed',
          updatedAt: 'later',
          steps: [step(1, 'FractalCloudAgent', 'Completed')],
        },
      },
    };
    h.state.queue = [
      before,
      {status: 202},
      touched, // differs, but carries no update step: not a verdict
      run('Completed', [
        step(1, 'FractalCloudAgent', 'Completed'),
        step(2, 'Update to 1.2.3', 'Completed'),
      ]),
    ];
    await cloud.environments.updateAgents(tree(), {
      quiet: true,
      agentUpdate: 'wait',
      pollIntervalMs: 1,
      timeoutMs: 5000,
      only: a => a.environment.shortName === 'mgmt' && a.provider === 'AWS',
    });
    expect(h.state.queue).toHaveLength(0);
    expect(h.requests).toHaveLength(4);
  });

  it('wait: a cancelled update throws', async () => {
    const before = run('Failed', [step(1, 'FractalCloudAgent', 'Failed')]);
    h.state.queue = [
      before,
      {status: 202},
      run('Cancelled', [
        step(1, 'FractalCloudAgent', 'Cancelled'),
        step(2, 'Update to 1.2.3', 'Cancelled'),
      ]),
    ];
    await expect(
      cloud.environments.updateAgents(tree(), {
        quiet: true,
        agentUpdate: 'wait',
        pollIntervalMs: 1,
        only: a => a.environment.shortName === 'mgmt' && a.provider === 'AWS',
      }),
    ).rejects.toThrow(/AWS cloud-agent update was cancelled/);
  });

  it('wait: awaits each update before starting the next, management first', async () => {
    const before = run('Completed', [step(1, 'FractalCloudAgent', 'Completed')]);
    const after = run('Completed', [
      step(1, 'FractalCloudAgent', 'Completed'),
      step(2, 'Update to 1.2.3', 'Completed'),
    ]);
    h.state.queue = [before, {status: 202}, after, before, {status: 202}, after];
    await cloud.environments.updateAgents(tree(), {
      quiet: true,
      agentUpdate: 'wait',
      pollIntervalMs: 1,
      only: a => a.provider === 'AWS',
    });
    expect(h.requests.map(r => `${r.method} ${r.url.slice(API.length)}`)).toEqual([
      'GET /mgmt/initializer/aws/status',
      'POST /mgmt/initializer/aws/update',
      'GET /mgmt/initializer/aws/status',
      'GET /prod/initializer/aws/status',
      'POST /prod/initializer/aws/update',
      'GET /prod/initializer/aws/status',
    ]);
  });

  it('wait: resolver credentials are redacted from a later status-poll error', async () => {
    const before = run('Completed', []);
    h.state.queue = [
      before,
      {status: 202},
      {status: 500, body: {message: 'rejected token prod-session-xyz'}},
    ];
    const err = await cloud.environments
      .updateAgents(tree(), {
        quiet: true,
        agentUpdate: 'wait',
        pollIntervalMs: 1,
        only: a => a.environment.shortName === 'prod',
        providerCredentials: () => ({
          aws: {
            accessKeyId: 'AKIA-prod',
            secretAccessKey: 'prod-secret-abc',
            sessionToken: 'prod-session-xyz',
          },
        }),
      })
      .then(
        () => expect.fail('expected the poll to fail'),
        (e: unknown) => e,
      );
    const text = `${String(err)} ${JSON.stringify(err)}`;
    expect(text).not.toContain('prod-session-xyz');
  });

  it('wait: a failed step fails the update with the step’s message', async () => {
    const before = run('Completed', [
      step(1, 'FractalCloudAgent', 'Completed'),
    ]);
    h.state.queue = [
      before,
      {status: 202},
      run('Failed', [
        step(1, 'FractalCloudAgent', 'Completed'),
        {
          ...step(2, 'FractalCloudAgent', 'Failed'),
          lastOperationStatusMessage: 'AWS credentials not found',
        },
      ]),
    ];
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(
      cloud.environments.updateAgents(tree(), {
        agentUpdate: 'wait',
        pollIntervalMs: 1,
        timeoutMs: 5000,
        only: a => a.environment.shortName === 'mgmt' && a.provider === 'AWS',
      }),
    ).rejects.toThrow(
      /AWS cloud-agent update failed[\s\S]*credentials not found/,
    );
    const logged = spy.mock.calls.map(c => c.join(' ')).join('\n');
    spy.mockRestore();
    expect(logged).toMatch(/ERROR Cloud-agent update failed/);
  });

  it('wait: an agent that was never initialized is refused before sending the update', async () => {
    h.state.queue = [{status: 404}];
    await expect(
      cloud.environments.updateAgents(tree(), {
        quiet: true,
        agentUpdate: 'wait',
        pollIntervalMs: 1,
        only: a => a.environment.shortName === 'mgmt' && a.provider === 'AWS',
      }),
    ).rejects.toThrow(/no initialization run/i);
    expect(h.requests.map(r => r.method)).toEqual(['GET']);
  });

  it('wait: times out with a canonical ERROR line', async () => {
    const before = run('Completed', []);
    h.state.queue = [before, {status: 202}];
    // Every later read keeps serving the stale run.
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const pending = cloud.environments.updateAgents(tree(), {
      agentUpdate: 'wait',
      pollIntervalMs: 1,
      timeoutMs: 30,
      only: a => a.environment.shortName === 'mgmt' && a.provider === 'AWS',
    });
    // Keep the queue topped up with the stale run while polling.
    const filler = setInterval(() => {
      h.state.queue.push(before);
    }, 1);
    await expect(pending).rejects.toThrow(/AWS cloud-agent update timed out/);
    clearInterval(filler);
    const logged = spy.mock.calls.map(c => c.join(' ')).join('\n');
    spy.mockRestore();
    expect(logged).toMatch(/ERROR Cloud-agent update timed out .*timeoutMs=30/);
  });
});
