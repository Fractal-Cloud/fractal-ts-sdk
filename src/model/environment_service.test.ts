/**
 * environment_service.test.ts — cloud.environments.deploy() with a mocked HTTP client.
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
} from './environment/index';
import {createFractalCloudClient} from './client';

const cloud = createFractalCloudClient({
  clientId: 'cid',
  clientSecret: 'secret',
});
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

describe('cloud.environments.deploy()', () => {
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
    await cloud.environments.deploy(mgmtOnly(), {
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
    await cloud.environments.deploy(mgmtOnly(), {
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
      cloud.environments.deploy(mgmtOnly(), {
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
    await cloud.environments.deploy(mgmtOnly(), {
      quiet: true,
      providerCredentials,
    });
    const methods = h.requests.map(r => r.method);
    expect(methods).toEqual(['GET', 'PUT', 'GET', 'POST']);
  });
  // Regression: the server rejects a PUT that names the environment as its own
  // management environment (reasonCode=SelfReferentialManagementEnvironment), so
  // create-of-management sending null is not enough — update must send null too.
  // Without this, a management env deploys once and fails on every re-run.
  it('update of a management env sends a null managementEnvironmentId', async () => {
    h.state.queue = [
      {
        status: 200, // fetch existing → differs (stale name)
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
    await cloud.environments.deploy(mgmtOnly(), {
      quiet: true,
      providerCredentials,
    });
    const put = h.requests.find(r => r.method === 'PUT');
    expect(put).toBeDefined();
    expect(put!.url).toBe(
      `https://api.fractal.cloud/environments/Personal/${OWNER}/mgmt`,
    );
    expect(
      (put!.body as {managementEnvironmentId: unknown}).managementEnvironmentId,
    ).toBeNull();
  });

  it('update of an operational env still carries the management id', async () => {
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
      {
        status: 200, // fetch prod → differs
        body: {
          id: {type: 'Personal', ownerId: OWNER, shortName: 'prod'},
          name: 'stale',
          resourceGroups: [],
          parameters: {},
          status: 'Active',
        },
      },
      {status: 200}, // PUT prod
      {status: 404}, // mgmt agent status
      {status: 202}, // mgmt initialize
      {status: 404}, // prod agent status
      {status: 202}, // prod initialize
    ];
    await cloud.environments.deploy(mgmt, {quiet: true, providerCredentials});

    const put = h.requests.find(r => r.method === 'PUT');
    expect(put).toBeDefined();
    expect(put!.url).toBe(
      `https://api.fractal.cloud/environments/Personal/${OWNER}/prod`,
    );
    expect(
      (put!.body as {managementEnvironmentId: unknown}).managementEnvironmentId,
    ).toEqual({type: 'Personal', ownerId: OWNER, shortName: 'mgmt'});
  });

  // The default-CI/CD-profile PUT goes through the same updateEnvironment DTO, on a
  // path that never had an isManagement flag to pass — it must be self-reference
  // safe too.
  it('the default-CI/CD-profile PUT on a management env sends null too', async () => {
    const withProfile = mgmtOnly().withDefaultCiCdProfile({
      shortName: 'gh',
      displayName: 'GitHub',
      sshPrivateKeyData: 'key-data',
    });
    h.state.queue = [
      {
        status: 200, // fetch existing → up-to-date apart from the profile default
        body: {
          id: {type: 'Personal', ownerId: OWNER, shortName: 'mgmt'},
          name: 'mgmt',
          resourceGroups: [rg('mgmt-rg')],
          parameters: {
            agents: [
              {
                provider: 'AZURE',
                region: 'westeurope',
                tenantId: 'tenant-1',
                subscriptionId: 'sub-mgmt',
              },
            ],
          },
          status: 'Active',
          defaultCiCdProfileShortName: null,
        },
      },
      {status: 201}, // ci-cd-profiles/bulk
      {status: 200}, // PUT setting the default profile
      {status: 404}, // agent status
      {status: 202}, // initialize
    ];
    await cloud.environments.deploy(withProfile, {
      quiet: true,
      providerCredentials,
    });
    const put = h.requests.find(r => r.method === 'PUT');
    expect(put).toBeDefined();
    const body = put!.body as {
      managementEnvironmentId: unknown;
      defaultCiCdProfileShortName: string;
    };
    expect(body.defaultCiCdProfileShortName).toBe('gh');
    expect(body.managementEnvironmentId).toBeNull();
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
    await cloud.environments.deploy(mgmtOnly(), {
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
    await cloud.environments.deploy(mgmt, {quiet: true, providerCredentials});

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
      cloud.environments.deploy(mgmtOnly(), {quiet: true}), // no providerCredentials
    ).rejects.toThrow(/requires providerCredentials/);
  });

  it('azure OIDC: forwards the client assertion, never an SP secret', async () => {
    h.state.queue = [
      {status: 404}, // fetch env → create
      {status: 201}, // create env
      {status: 404}, // agent status → needs start
      {status: 202}, // initialize
    ];
    await cloud.environments.deploy(mgmtOnly(), {
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
      cloud.environments.deploy(mgmtOnly(), {
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
    await cloud.environments.deploy(mgmtOnly(), {
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
    await cloud.environments.deploy(mgmtOnly(), {
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

/**
 * A finished initialization is not proof of a live agent.
 *
 * The status endpoint stores the last initialization RUN. When a management
 * plane is destroyed out of band (the nightly Azure cleanup deleted
 * `basic_environment`'s plane on 2026-08-24, agent web app included), that run
 * still reads `Completed`, so `needsStart` was false forever: no initialize was
 * ever sent again, the poll loop read the same `Completed` and reported success,
 * and `createOrUpdateEnvironment` reported "Environment up-to-date" because the
 * environment RECORD was intact. Sixteen days of green deploys over an agent
 * that did not exist. There is no liveness endpoint to consult, so the escape is
 * explicit and opt-in: `reinitializeAgents`.
 */
describe('cloud.environments.deploy() — reinitializeAgents', () => {
  /** The body the SDK sends on create — fed back as the GET response it makes an
   *  environment look already up-to-date (name, resource groups and every
   *  managed parameter equal), which is the state the deadlock needs. */
  const upToDateEnvBody = async () => {
    h.requests.length = 0;
    h.state.queue = [{status: 404}, {status: 201}, {status: 404}, {status: 202}];
    await cloud.environments.deploy(mgmtOnly(), {
      quiet: true,
      providerCredentials,
    });
    const created = h.requests[1].body as {
      name: string;
      resourceGroups: string[];
      parameters: Record<string, unknown>;
    };
    h.requests.length = 0;
    h.state.queue = [];
    return {
      status: 200,
      body: {
        id: {type: 'Personal', ownerId: OWNER, shortName: 'mgmt'},
        name: created.name,
        resourceGroups: created.resourceGroups,
        parameters: created.parameters,
        status: 'Active',
      },
    };
  };

  const completed = {
    status: 200,
    body: {initializationRun: {status: 'Completed', steps: []}},
  };

  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  it('option unset: a stored Completed run still short-circuits (today’s behavior)', async () => {
    const existing = await upToDateEnvBody();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Pre-start read, then the poll loop's own read: the same stored run twice.
    h.state.queue = [existing, completed, completed];
    await cloud.environments.deploy(mgmtOnly(), {
      agentInit: 'wait',
      pollIntervalMs: 1,
      timeoutMs: 5000,
      providerCredentials,
    });
    const logged = spy.mock.calls.map(c => c.join(' ')).join('\n');
    spy.mockRestore();

    // No initialize sent, and both "nothing to do" reports still emitted verbatim.
    expect(h.requests.map(r => r.method)).toEqual(['GET', 'GET', 'GET']);
    expect(h.requests.some(r => r.url.endsWith('/initialize'))).toBe(false);
    expect(logged).toContain('Environment up-to-date');
    expect(logged).toContain('Cloud-agent initialization completed');
    expect(logged).not.toContain('forced=');
  });

  it('option unset with no stored run: unchanged, and never reports a forced start', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    h.state.queue = [{status: 404}, {status: 201}, {status: 404}, {status: 202}];
    await cloud.environments.deploy(mgmtOnly(), {providerCredentials});
    const logged = spy.mock.calls.map(c => c.join(' ')).join('\n');
    spy.mockRestore();

    expect(h.requests.map(r => r.method)).toEqual(['GET', 'POST', 'GET', 'POST']);
    expect(logged).toContain('Starting cloud-agent initialization');
    expect(logged).not.toContain('forced=');
  });

  it('reinitializeAgents: initializes despite a stored Completed run', async () => {
    const existing = await upToDateEnvBody();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    h.state.queue = [existing, completed, {status: 202}];
    await cloud.environments.deploy(mgmtOnly(), {
      reinitializeAgents: true,
      providerCredentials,
    });
    const logged = spy.mock.calls.map(c => c.join(' ')).join('\n');
    spy.mockRestore();

    expect(h.requests.map(r => r.method)).toEqual(['GET', 'GET', 'POST']);
    const init = h.requests[2];
    expect(init.url).toBe(
      `https://api.fractal.cloud/environments/Personal/${OWNER}/mgmt/initializer/azure/initialize`,
    );
    // The "Environment up-to-date" short-circuit is upstream of agent
    // initialization and must not swallow the forced run.
    expect(logged).toContain('Environment up-to-date');
    expect(logged).toContain('forced=true');
  });

  it('reinitializeAgents + wait: the run it forced over is not accepted as the verdict', async () => {
    const existing = await upToDateEnvBody();
    h.state.queue = [
      existing,
      completed, // pre-start read → force anyway
      {status: 202}, // initialize
      completed, // stale: the server still serves the OLD run
      completed, // still stale
      {
        status: 200,
        body: {initializationRun: {status: 'InProgress', steps: []}},
      }, // the new run appears
      completed, // and finishes
    ];
    await cloud.environments.deploy(mgmtOnly(), {
      quiet: true,
      agentInit: 'wait',
      reinitializeAgents: true,
      pollIntervalMs: 1,
      timeoutMs: 5000,
      providerCredentials,
    });
    // Had the stale Completed been accepted, the deploy would have returned after
    // request 4 and left the last three responses in the queue.
    expect(h.requests.map(r => r.method)).toEqual([
      'GET',
      'GET',
      'POST',
      'GET',
      'GET',
      'GET',
      'GET',
    ]);
    expect(h.state.queue).toHaveLength(0);
  });

  it('reinitializeAgents + wait: a genuinely new failure is still reported', async () => {
    const existing = await upToDateEnvBody();
    h.state.queue = [
      existing,
      completed,
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
      cloud.environments.deploy(mgmtOnly(), {
        quiet: true,
        agentInit: 'wait',
        reinitializeAgents: true,
        pollIntervalMs: 1,
        timeoutMs: 5000,
        providerCredentials,
      }),
    ).rejects.toThrow(/initialization failed/);
  });
});
