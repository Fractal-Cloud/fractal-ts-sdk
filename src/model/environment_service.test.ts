/**
 * environment_service.test.ts — deployEnvironment() with a mocked HTTP client.
 *
 * Proves the orchestration WITHOUT a live API: create-vs-update, management-first
 * ordering, operational env carrying the management id, cloud-agent initialize
 * (fire-and-forget + wait-poll), and the missing-provider-credentials guard.
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

import {
  ManagementEnvironment,
  OperationalEnvironment,
  deployEnvironment,
} from './environment/index';

const creds = {clientId: 'cid', clientSecret: 'secret'};
const OWNER = '2e114308-14ec-4d77-b610-490324fa1844';
const rg = (name: string) => `Personal/${OWNER}/${name}`;
const providerCredentials = {
  azure: {spClientId: 'sp-id', spClientSecret: 'sp-secret'},
};

const mgmtOnly = () =>
  ManagementEnvironment({
    id: {type: 'Personal', ownerId: OWNER, shortName: 'mgmt'},
    resourceGroups: [rg('mgmt-rg')],
  }).withAzureCloudAgent({
    region: 'westeurope',
    tenantId: 'tenant-1',
    subscriptionId: 'sub-mgmt',
  });

describe('deployEnvironment()', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  it('fire-and-forget: creates env then starts cloud-agent init', async () => {
    h.state.queue = [
      {status: 404}, // fetch env → create
      {status: 201}, // create env
      {status: 404}, // agent init status → needs start
      {status: 202}, // initialize
    ];
    await deployEnvironment(mgmtOnly(), creds, {
      quiet: true,
      providerCredentials,
    });

    const methods = h.requests.map(r => r.method);
    expect(methods).toEqual(['GET', 'POST', 'GET', 'POST']);

    const create = h.requests[1];
    expect(create.url).toBe(
      `https://api.fractal.cloud/environments/Personal/${OWNER}/mgmt`,
    );
    const cbody = create.body as {
      managementEnvironmentId: unknown;
      parameters: {agents: {provider: string}[]};
    };
    expect(cbody.managementEnvironmentId).toBeNull(); // management env
    expect(cbody.parameters.agents.map(a => a.provider)).toEqual(['AZURE']);

    const init = h.requests[3];
    expect(init.url).toBe(
      `https://api.fractal.cloud/environments/Personal/${OWNER}/mgmt/initializer/azure/initialize`,
    );
    const ibody = init.body as {
      tenantId: string;
      subscriptionId: string;
      region: string;
      managementEnvironmentId: {shortName: string};
    };
    expect(ibody.tenantId).toBe('tenant-1');
    expect(ibody.subscriptionId).toBe('sub-mgmt');
    expect(ibody.region).toBe('westeurope');
    expect(ibody.managementEnvironmentId.shortName).toBe('mgmt');
  });

  it('wait: polls cloud-agent init to Completed', async () => {
    h.state.queue = [
      {status: 404}, // fetch env → create
      {status: 201}, // create env
      {status: 404}, // agent status → needs start
      {status: 202}, // initialize
      {
        status: 200,
        body: {initializationRun: {status: 'InProgress', steps: []}},
      },
      {
        status: 200,
        body: {initializationRun: {status: 'Completed', steps: []}},
      },
    ];
    await deployEnvironment(mgmtOnly(), creds, {
      quiet: true,
      agentInit: 'wait',
      pollIntervalMs: 1,
      timeoutMs: 5000,
      providerCredentials,
    });
    const methods = h.requests.map(r => r.method);
    expect(methods).toEqual(['GET', 'POST', 'GET', 'POST', 'GET', 'GET']);
  });

  it('wait: throws when cloud-agent init reports a failed step', async () => {
    h.state.queue = [
      {status: 404},
      {status: 201},
      {status: 404},
      {status: 202},
      {
        status: 200,
        body: {
          initializationRun: {
            status: 'Failed',
            steps: [
              {
                status: 'Failed',
                resourceName: 'kv',
                lastOperationStatusMessage: 'boom',
              },
            ],
          },
        },
      },
    ];
    await expect(
      deployEnvironment(mgmtOnly(), creds, {
        quiet: true,
        agentInit: 'wait',
        pollIntervalMs: 1,
        timeoutMs: 5000,
        providerCredentials,
      }),
    ).rejects.toThrow(/initialization failed/);
  });

  it('updates env (PUT) when it already exists and differs', async () => {
    h.state.queue = [
      {
        status: 200, // fetch existing → differs (empty name/rgs)
        body: {
          id: {type: 'Personal', ownerId: OWNER, shortName: 'mgmt'},
          name: 'stale',
          resourceGroups: [],
          parameters: {},
          status: 'Active',
        },
      },
      {status: 200}, // PUT update
      {status: 404}, // agent status
      {status: 202}, // initialize
    ];
    await deployEnvironment(mgmtOnly(), creds, {
      quiet: true,
      providerCredentials,
    });
    const methods = h.requests.map(r => r.method);
    expect(methods).toEqual(['GET', 'PUT', 'GET', 'POST']);
  });

  it('skips PUT when only param key order / server-added keys differ', async () => {
    h.state.queue = [
      {
        status: 200, // existing matches — reordered agent keys + an extra server key
        body: {
          id: {type: 'Personal', ownerId: OWNER, shortName: 'mgmt'},
          name: 'mgmt',
          resourceGroups: [rg('mgmt-rg')],
          parameters: {
            serverAddedField: 'ignore-me',
            agents: [
              {
                subscriptionId: 'sub-mgmt',
                region: 'westeurope',
                provider: 'AZURE',
                tenantId: 'tenant-1',
              },
            ],
          },
          status: 'Active',
        },
      },
      {status: 404}, // agent status
      {status: 202}, // initialize
    ];
    await deployEnvironment(mgmtOnly(), creds, {
      quiet: true,
      providerCredentials,
    });
    const methods = h.requests.map(r => r.method);
    expect(methods).toEqual(['GET', 'GET', 'POST']); // no PUT — no drift
  });

  it('operational env is created after management, carrying the management id', async () => {
    const prod = OperationalEnvironment({
      shortName: 'prod',
      resourceGroups: [rg('prod-rg')],
    }).withAzureSubscription({
      region: 'northeurope',
      subscriptionId: 'sub-prod',
    });
    const mgmt = mgmtOnly().withOperationalEnvironments([prod]);

    h.state.queue = [
      {status: 404}, // fetch mgmt → create
      {status: 201}, // create mgmt
      {status: 404}, // fetch prod → create
      {status: 201}, // create prod
      {status: 404}, // mgmt azure status
      {status: 202}, // mgmt azure init
      {status: 404}, // prod azure status
      {status: 202}, // prod azure init
    ];
    await deployEnvironment(mgmt, creds, {quiet: true, providerCredentials});

    const posts = h.requests.filter(r => r.method === 'POST');
    // create mgmt, create prod, then two initializes
    const createProd = posts[1];
    expect(createProd.url).toBe(
      `https://api.fractal.cloud/environments/Personal/${OWNER}/prod`,
    );
    const body = createProd.body as {
      managementEnvironmentId: {shortName: string} | null;
    };
    expect(body.managementEnvironmentId).toEqual({
      type: 'Personal',
      ownerId: OWNER,
      shortName: 'mgmt',
    });
  });

  it('throws when a cloud agent has no matching provider credentials', async () => {
    h.state.queue = [
      {status: 404}, // fetch env
      {status: 201}, // create env
      {status: 404}, // agent status → needs start (then headers throw)
    ];
    await expect(
      deployEnvironment(mgmtOnly(), creds, {quiet: true}), // no providerCredentials
    ).rejects.toThrow(/requires providerCredentials/);
  });

  it('azure OIDC: forwards the client assertion, never an SP secret', async () => {
    h.state.queue = [
      {status: 404}, // fetch env → create
      {status: 201}, // create env
      {status: 404}, // agent status → needs start
      {status: 202}, // initialize
    ];
    await deployEnvironment(mgmtOnly(), creds, {
      quiet: true,
      providerCredentials: {
        azure: {clientId: 'app-reg-id', federatedToken: 'gh.oidc.jwt'},
      },
    });
    const init = h.requests.find(r => r.url.endsWith('/initialize'));
    expect(init).toBeDefined();
    expect(init!.headers['X-Azure-SP-Client-ID']).toBe('app-reg-id');
    expect(init!.headers['X-Azure-Client-Assertion']).toBe('gh.oidc.jwt');
    expect(init!.headers['X-Azure-SP-Client-Secret']).toBeUndefined();
  });

  it('throws when azure creds mix an SP secret and a federated token', async () => {
    h.state.queue = [{status: 404}, {status: 201}, {status: 404}];
    const mixed = {
      spClientId: 'sp',
      spClientSecret: 'shh',
      federatedToken: 'jwt',
    };
    await expect(
      deployEnvironment(mgmtOnly(), creds, {
        quiet: true,
        providerCredentials: {azure: mixed as never},
      }),
    ).rejects.toThrow(/both static and federated/);
  });

  it('azure: an empty federated token falls through to the SP secret', async () => {
    h.state.queue = [
      {status: 404}, // fetch env → create
      {status: 201}, // create env
      {status: 404}, // agent status → needs start
      {status: 202}, // initialize
    ];
    // Empty federated token alongside a real secret: not "mixed", and must not be
    // treated as an OIDC init — fall through to the service-principal path.
    const creds2 = {
      spClientId: 'sp-id',
      spClientSecret: 'sp-secret',
      federatedToken: '',
    };
    await deployEnvironment(mgmtOnly(), creds, {
      quiet: true,
      providerCredentials: {azure: creds2 as never},
    });
    const init = h.requests.find(r => r.url.endsWith('/initialize'));
    expect(init).toBeDefined();
    expect(init!.headers['X-Azure-SP-Client-Secret']).toBe('sp-secret');
    expect(init!.headers['X-Azure-Client-Assertion']).toBeUndefined();
  });

  it('never logs the federated token', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    h.state.queue = [
      {status: 404},
      {status: 201},
      {status: 404},
      {status: 202},
    ];
    await deployEnvironment(mgmtOnly(), creds, {
      quiet: false, // logging ON — assert the token still never appears
      providerCredentials: {
        azure: {clientId: 'app-reg-id', federatedToken: 'super-secret-jwt'},
      },
    });
    const logged = spy.mock.calls.map(c => c.join(' ')).join('\n');
    expect(logged).not.toContain('super-secret-jwt');
    spy.mockRestore();
  });
});
