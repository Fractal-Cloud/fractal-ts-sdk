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
      // mgmt already initialized — the control plane refuses an operational
      // initialization until it is (ManagementEnvironmentNotInitialized)
      {status: 200, body: {initializationRun: {status: 'Completed'}}},
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
      {
        status: 200, // mgmt azure poll → Completed (wait mode)
        body: {initializationRun: {status: 'Completed'}},
      },
      {status: 404}, // prod azure status
      {status: 202}, // prod azure init
      {
        status: 200, // prod azure poll → Completed
        body: {initializationRun: {status: 'Completed'}},
      },
    ];
    await cloud.environments.deploy(mgmt, {
      quiet: true,
      providerCredentials,
      agentInit: 'wait',
      pollIntervalMs: 1,
    });

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

// ── parameter merge on update ────────────────────────────────────────────────
// The API's PUT replaces `parameters` wholesale. These pin that a deploy only
// ever writes the keys it declares, so a key set elsewhere (the web UI, the
// server itself) survives every re-run.
describe('cloud.environments.deploy() — parameter merge', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  const AZURE_AGENT = {
    provider: 'AZURE',
    region: 'westeurope',
    tenantId: 'tenant-1',
    subscriptionId: 'sub-mgmt',
  };
  const existingMgmt = (
    parameters: Record<string, unknown>,
    extra: Record<string, unknown> = {},
  ) => ({
    status: 200,
    body: {
      id: {type: 'Personal', ownerId: OWNER, shortName: 'mgmt'},
      name: 'mgmt',
      resourceGroups: [rg('mgmt-rg')],
      parameters,
      status: 'Active',
      ...extra,
    },
  });
  const completed = {
    status: 200,
    body: {initializationRun: {status: 'Completed'}},
  };
  const putBodies = () =>
    h.requests
      .filter(r => r.method === 'PUT')
      .map(r => r.body as {parameters: Record<string, unknown>});

  it('keeps a networkTier set outside the SDK when another change forces a PUT', async () => {
    h.state.queue = [
      existingMgmt({
        networkTier: 'prod', // set in the web UI
        serverAddedField: {kept: true},
        agents: [{...AZURE_AGENT, region: 'eastus'}], // drift → PUT
      }),
      {status: 200}, // PUT
      completed, // agent status → nothing to do
    ];
    await cloud.environments.deploy(mgmtOnly(), {
      quiet: true,
      providerCredentials,
    });
    const [put] = putBodies();
    expect(put.parameters).toEqual({
      networkTier: 'prod',
      serverAddedField: {kept: true},
      agents: [AZURE_AGENT],
    });
  });

  it('overlays a declared networkTier, replacing a differently-cased key', async () => {
    h.state.queue = [
      existingMgmt({NetworkTier: 'nonprod', agents: [AZURE_AGENT]}),
      {status: 200}, // PUT
      completed,
    ];
    await cloud.environments.deploy(mgmtOnly().withNetworkTier('prod'), {
      quiet: true,
      providerCredentials,
    });
    const [put] = putBodies();
    // One key, the declared spelling — the server matches keys
    // case-insensitively, so leaving both would make the result order-dependent.
    expect(put.parameters).toEqual({
      networkTier: 'prod',
      agents: [AZURE_AGENT],
    });
  });

  it('does not PUT when the declared networkTier already matches', async () => {
    h.state.queue = [
      existingMgmt({networkTier: 'prod', agents: [AZURE_AGENT], ui: 'x'}),
      completed,
    ];
    await cloud.environments.deploy(mgmtOnly().withNetworkTier('prod'), {
      quiet: true,
      providerCredentials,
    });
    expect(h.requests.map(r => r.method)).toEqual(['GET', 'GET']);
  });

  it('withParameter(key, null) removes the key — and that alone is drift', async () => {
    h.state.queue = [
      existingMgmt({legacyFlag: 'on', keep: 1, agents: [AZURE_AGENT]}),
      {status: 200}, // PUT
      completed,
    ];
    await cloud.environments.deploy(
      mgmtOnly().withParameter('legacyFlag', null),
      {quiet: true, providerCredentials},
    );
    const [put] = putBodies();
    expect(put.parameters).toEqual({keep: 1, agents: [AZURE_AGENT]});
  });

  it('a removed key that is already absent is not drift', async () => {
    h.state.queue = [existingMgmt({agents: [AZURE_AGENT]}), completed];
    await cloud.environments.deploy(
      mgmtOnly().withParameter('legacyFlag', null),
      {quiet: true, providerCredentials},
    );
    expect(putBodies()).toEqual([]);
  });

  it('the default-CI/CD-profile PUT carries the merged parameters too', async () => {
    h.state.queue = [
      existingMgmt(
        {networkTier: 'prod', agents: [AZURE_AGENT]},
        {defaultCiCdProfileShortName: null},
      ),
      {status: 201}, // ci-cd-profiles/bulk
      {status: 200}, // PUT setting the default profile
      completed,
    ];
    await cloud.environments.deploy(
      mgmtOnly().withDefaultCiCdProfile({
        shortName: 'gh',
        displayName: 'GitHub',
        sshPrivateKeyData: 'key-data',
      }),
      {quiet: true, providerCredentials},
    );
    const puts = putBodies();
    expect(puts).toHaveLength(1);
    expect(puts[0].parameters).toEqual({
      networkTier: 'prod',
      agents: [AZURE_AGENT],
    });
  });

  it('create sends declared parameters, omitting keys declared absent', async () => {
    h.state.queue = [
      {status: 404}, // fetch → create
      {status: 201}, // create
      completed,
    ];
    await cloud.environments.deploy(
      mgmtOnly()
        .withNetworkTier('nonprod')
        .withParameter('costCenter', 'cc-42')
        .withParameter('gone', null),
      {quiet: true, providerCredentials},
    );
    const create = h.requests[1];
    expect(create.method).toBe('POST');
    expect(
      (create.body as {parameters: Record<string, unknown>}).parameters,
    ).toEqual({
      networkTier: 'nonprod',
      costCenter: 'cc-42',
      agents: [AZURE_AGENT],
    });
  });
});

// ── per-environment provider credentials ───────────────────────────────────────
describe('cloud.environments.deploy() — per-environment credentials', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  const ORG = 'o-abc123';
  const awsTree = () =>
    ManagementEnvironment({
      id: {type: 'Personal', ownerId: OWNER, shortName: 'mgmt'},
      resourceGroups: [rg('mgmt-rg')],
    })
      .withAwsCloudAgent({
        region: 'eu-central-1',
        organizationId: ORG,
        accountId: '111111111111',
      })
      .withOperationalEnvironment(
        OperationalEnvironment({
          shortName: 'prod',
          resourceGroups: [rg('prod-rg')],
        })
          .withAwsAccount({region: 'eu-central-1', accountId: '222222222222'})
          .withNetworkTier('prod'),
      )
      .withOperationalEnvironment(
        OperationalEnvironment({
          shortName: 'dev',
          resourceGroups: [rg('dev-rg')],
        })
          .withAwsAccount({region: 'eu-west-1', accountId: '333333333333'})
          .withNetworkTier('nonprod'),
      );

  const sessionCreds = (account: string) => ({
    aws: {
      accessKeyId: `AKIA${account}`,
      secretAccessKey: `secret-${account}`,
      sessionToken: `token-${account}`,
    },
  });
  const done = {status: 200, body: {initializationRun: {status: 'Completed'}}};
  const freshTreeQueue = () => [
    {status: 404}, // fetch mgmt
    {status: 201}, // create mgmt
    {status: 404}, // fetch prod
    {status: 201}, // create prod
    {status: 404}, // fetch dev
    {status: 201}, // create dev
    {status: 404}, // mgmt status
    {status: 202}, // mgmt initialize
    done, // mgmt poll
    {status: 404}, // prod status
    {status: 202}, // prod initialize
    done, // prod poll
    {status: 404}, // dev status
    {status: 202}, // dev initialize
    done, // dev poll
  ];

  it('asks the resolver per environment and sends each its own credentials', async () => {
    h.state.queue = freshTreeQueue();
    const asked: unknown[] = [];
    await cloud.environments.deploy(awsTree(), {
      quiet: true,
      agentInit: 'wait',
      pollIntervalMs: 1,
      providerCredentials: async request => {
        asked.push(request);
        return sessionCreds(request.accountId);
      },
    });

    expect(asked).toEqual([
      {
        environment: {type: 'Personal', ownerId: OWNER, shortName: 'mgmt'},
        tier: 'management',
        provider: 'AWS',
        accountId: '111111111111',
        region: 'eu-central-1',
      },
      {
        environment: {type: 'Personal', ownerId: OWNER, shortName: 'prod'},
        tier: 'operational',
        provider: 'AWS',
        accountId: '222222222222',
        region: 'eu-central-1',
      },
      {
        environment: {type: 'Personal', ownerId: OWNER, shortName: 'dev'},
        tier: 'operational',
        provider: 'AWS',
        accountId: '333333333333',
        region: 'eu-west-1',
      },
    ]);

    const inits = h.requests.filter(r => r.url.endsWith('/initialize'));
    expect(inits.map(r => r.url.split('/')[6])).toEqual([
      'mgmt',
      'prod',
      'dev',
    ]);
    expect(inits.map(r => r.headers['X-AWS-Access-Key-ID'])).toEqual([
      'AKIA111111111111',
      'AKIA222222222222',
      'AKIA333333333333',
    ]);
    expect(inits.map(r => r.headers['X-AWS-Session-Token'])).toEqual([
      'token-111111111111',
      'token-222222222222',
      'token-333333333333',
    ]);
    // The operational init body names its own account, under the mgmt org.
    expect(inits[2].body).toMatchObject({
      organizationId: ORG,
      accountId: '333333333333',
      region: 'eu-west-1',
    });
    // Each operational env was created with its own tier.
    const creates = h.requests.filter(
      r => r.method === 'POST' && !r.url.endsWith('/initialize'),
    );
    expect(
      creates.map(
        r => (r.body as {parameters: {networkTier?: string}}).parameters,
      ),
    ).toMatchObject([{}, {networkTier: 'prod'}, {networkTier: 'nonprod'}]);
    expect(
      (creates[0].body as {parameters: Record<string, unknown>}).parameters,
    ).not.toHaveProperty('networkTier');
  });

  it('does not ask for credentials an already-initialized agent does not need', async () => {
    h.state.queue = [
      {status: 404}, // fetch mgmt
      {status: 201}, // create mgmt
      {status: 404}, // fetch prod
      {status: 201}, // create prod
      {status: 404}, // fetch dev
      {status: 201}, // create dev
      done, // mgmt status → Completed, no initialize
      done, // mgmt poll
      done, // prod status → Completed
      done, // prod poll
      {status: 404}, // dev status → start
      {status: 202}, // dev initialize
      done, // dev poll
    ];
    const asked: string[] = [];
    await cloud.environments.deploy(awsTree(), {
      quiet: true,
      agentInit: 'wait',
      pollIntervalMs: 1,
      providerCredentials: request => {
        asked.push(request.environment.shortName);
        return sessionCreds(request.accountId);
      },
    });
    expect(asked).toEqual(['dev']);
  });

  it('fails clearly when the resolver returns nothing for an environment', async () => {
    h.state.queue = freshTreeQueue();
    await expect(
      cloud.environments.deploy(awsTree(), {
        quiet: true,
        agentInit: 'wait',
        pollIntervalMs: 1,
        providerCredentials: request =>
          request.tier === 'management'
            ? sessionCreds(request.accountId)
            : undefined,
      }),
    ).rejects.toThrow(
      /AWS in environment 'Personal\/[^']+\/prod' requires aws credentials, but the providerCredentials resolver returned none/,
    );
    // Nothing was sent for prod.
    expect(
      h.requests.filter(r => r.url.endsWith('/prod/initializer/aws/initialize')),
    ).toHaveLength(0);
  });

  it('a single credentials object is still used for every environment', async () => {
    h.state.queue = freshTreeQueue();
    await cloud.environments.deploy(awsTree(), {
      quiet: true,
      agentInit: 'wait',
      pollIntervalMs: 1,
      providerCredentials: sessionCreds('shared'),
    });
    const inits = h.requests.filter(r => r.url.endsWith('/initialize'));
    expect(inits).toHaveLength(3);
    expect(
      new Set(inits.map(r => r.headers['X-AWS-Access-Key-ID'])),
    ).toEqual(new Set(['AKIAshared']));
  });

  it("fire-and-forget on a new tree starts management, then refuses operational naming agentInit: 'wait'", async () => {
    h.state.queue = [
      {status: 404}, // fetch mgmt
      {status: 201}, // create mgmt
      {status: 404}, // fetch prod
      {status: 201}, // create prod
      {status: 404}, // fetch dev
      {status: 201}, // create dev
      {status: 404}, // mgmt status
      {status: 202}, // mgmt initialize
      {status: 404}, // prod status → would start, refused before sending
    ];
    const asked: string[] = [];
    await expect(
      cloud.environments.deploy(awsTree(), {
        quiet: true,
        providerCredentials: request => {
          asked.push(request.environment.shortName);
          return sessionCreds(request.accountId);
        },
      }),
    ).rejects.toThrow(/management environment .* Completed AWS initialization.*agentInit: 'wait'/s);
    const inits = h.requests.filter(r => r.url.endsWith('/initialize'));
    expect(inits.map(r => r.url.split('/')[6])).toEqual(['mgmt']);
    expect(asked).toEqual(['mgmt']); // prod's credentials were never minted
  });

  it('fire-and-forget proceeds to operational envs once management is Completed', async () => {
    h.state.queue = [
      {status: 404}, // fetch mgmt
      {status: 201}, // create mgmt
      {status: 404}, // fetch prod
      {status: 201}, // create prod
      {status: 404}, // fetch dev
      {status: 201}, // create dev
      done, // mgmt status → Completed
      {status: 404}, // prod status
      {status: 202}, // prod initialize
      {status: 404}, // dev status
      {status: 202}, // dev initialize
    ];
    await cloud.environments.deploy(awsTree(), {
      quiet: true,
      providerCredentials: request => sessionCreds(request.accountId),
    });
    const inits = h.requests.filter(r => r.url.endsWith('/initialize'));
    expect(inits.map(r => r.url.split('/')[6])).toEqual(['prod', 'dev']);
  });

  it('warns when AWS credentials are web-identity', async () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((m: string) => {
      lines.push(m);
    });
    try {
      const mgmt = ManagementEnvironment({
        id: {type: 'Personal', ownerId: OWNER, shortName: 'mgmt'},
        resourceGroups: [rg('mgmt-rg')],
      }).withAwsCloudAgent({
        region: 'eu-central-1',
        organizationId: ORG,
        accountId: '111111111111',
      });
      h.state.queue = [{status: 404}, {status: 201}, {status: 404}, {status: 202}];
      await cloud.environments.deploy(mgmt, {
        providerCredentials: {
          aws: {roleArn: 'arn:aws:iam::1:role/r', webIdentityToken: 'jwt'},
        },
      });
      h.state.queue = [{status: 404}, {status: 201}, {status: 404}, {status: 202}];
      await cloud.environments.deploy(mgmt, {
        providerCredentials: sessionCreds('111111111111'),
      });
    } finally {
      spy.mockRestore();
    }
    const warns = lines.filter(l => / WARN /.test(l));
    expect(warns).toHaveLength(1);
    expect(warns[0]).toMatch(/web-identity credentials .* not honored/);
  });

  it.each([
    [{accessKeyId: 'AKIA', secretAccessKey: 's'}, 'sessionToken'],
    [{accessKeyId: 'AKIA', secretAccessKey: 's', sessionToken: ''}, 'sessionToken'],
    [{accessKeyId: 'AKIA', sessionToken: 't'}, 'secretAccessKey'],
  ])(
    'refuses a partial static AWS set before any request: %j',
    async (aws, missing) => {
      await expect(
        cloud.environments.deploy(awsTree(), {
          quiet: true,
          providerCredentials: {aws: aws as never},
        }),
      ).rejects.toThrow(
        new RegExp(`all of accessKeyId, secretAccessKey and sessionToken.*missing: ${missing}`),
      );
      expect(h.requests).toHaveLength(0);
    },
  );

  it('refuses a partial AWS set from the resolver, before sending it', async () => {
    h.state.queue = [
      {status: 404}, // fetch mgmt
      {status: 201}, // create mgmt
      {status: 404}, // fetch prod
      {status: 201}, // create prod
      {status: 404}, // fetch dev
      {status: 201}, // create dev
      {status: 404}, // mgmt status → start
    ];
    await expect(
      cloud.environments.deploy(awsTree(), {
        quiet: true,
        agentInit: 'wait',
        providerCredentials: () => ({
          aws: {accessKeyId: 'AKIA', secretAccessKey: 's'},
        }),
      }),
    ).rejects.toThrow(
      /resolver returned unusable credentials for environment 'Personal\/[^']+\/mgmt'.*missing: sessionToken/,
    );
    expect(h.requests.filter(r => r.url.endsWith('/initialize'))).toHaveLength(
      0,
    );
  });
});

// ── read operations ──────────────────────────────────────────────────────────
describe('cloud.environments.list() / get()', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  it('list calls GET /environments/{type}/{ownerId} and maps the summaries', async () => {
    h.state.queue = [
      {
        status: 200,
        body: [
          {
            id: {type: 'Organizational', ownerId: OWNER, shortName: 'mgmt'},
            name: 'Management',
            status: 'Active',
            resourceGroups: [rg('mgmt-rg')],
            initializedClouds: ['Aws'],
          },
          {
            id: {type: 'Organizational', ownerId: OWNER, shortName: 'prod'},
            name: 'Production',
            status: 'Pending',
            resourceGroups: null,
            initializedClouds: [],
          },
        ],
      },
    ];
    const envs = await cloud.environments.list({
      type: 'Organizational',
      ownerId: OWNER,
    });
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0].method).toBe('GET');
    expect(h.requests[0].url).toBe(
      `https://api.fractal.cloud/environments/Organizational/${OWNER}`,
    );
    expect(h.requests[0].headers['X-ClientID']).toBe('cid');
    expect(envs).toEqual([
      {
        id: {type: 'Organizational', ownerId: OWNER, shortName: 'mgmt'},
        name: 'Management',
        status: 'Active',
        resourceGroups: [rg('mgmt-rg')],
        initializedClouds: ['Aws'],
      },
      {
        id: {type: 'Organizational', ownerId: OWNER, shortName: 'prod'},
        name: 'Production',
        status: 'Pending',
        resourceGroups: [],
        initializedClouds: [],
      },
    ]);
  });

  it('list returns [] for an owner with no environments', async () => {
    h.state.queue = [{status: 200, body: []}];
    expect(
      await cloud.environments.list({type: 'Personal', ownerId: OWNER}),
    ).toEqual([]);
  });

  it('list refuses a blank ownerId without calling the API', async () => {
    await expect(
      cloud.environments.list({type: 'Personal', ownerId: ' '}),
    ).rejects.toThrow(/requires an ownerId/);
    expect(h.requests).toHaveLength(0);
  });

  it('list percent-encodes the path segments', async () => {
    h.state.queue = [{status: 200, body: []}];
    await cloud.environments.list({type: 'Personal', ownerId: '../x'});
    expect(h.requests[0].url).toBe(
      'https://api.fractal.cloud/environments/Personal/..%2Fx',
    );
  });

  it('get returns every parameter, and the management id', async () => {
    h.state.queue = [
      {
        status: 200,
        body: {
          managementEnvironmentId: {
            type: 'Personal',
            ownerId: OWNER,
            shortName: 'mgmt',
          },
          id: {type: 'Personal', ownerId: OWNER, shortName: 'prod'},
          name: 'Production',
          resourceGroups: [rg('prod-rg')],
          parameters: {networkTier: 'prod', agents: []},
          defaultCiCdProfileShortName: null,
          status: 'Active',
          createdAt: '2026-01-01T00:00:00Z',
        },
      },
    ];
    const env = await cloud.environments.get({
      type: 'Personal',
      ownerId: OWNER,
      shortName: 'prod',
    });
    expect(h.requests[0].url).toBe(
      `https://api.fractal.cloud/environments/Personal/${OWNER}/prod`,
    );
    expect(env).toEqual({
      id: {type: 'Personal', ownerId: OWNER, shortName: 'prod'},
      managementEnvironmentId: {
        type: 'Personal',
        ownerId: OWNER,
        shortName: 'mgmt',
      },
      name: 'Production',
      status: 'Active',
      resourceGroups: [rg('prod-rg')],
      parameters: {networkTier: 'prod', agents: []},
      defaultCiCdProfileShortName: null,
    });
  });

  it('get returns null for a missing environment', async () => {
    h.state.queue = [{status: 404}];
    expect(
      await cloud.environments.get({
        type: 'Personal',
        ownerId: OWNER,
        shortName: 'nope',
      }),
    ).toBeNull();
  });

  it('get maps a management environment to a null managementEnvironmentId', async () => {
    h.state.queue = [
      {
        status: 200,
        body: {
          managementEnvironmentId: null,
          id: {type: 'Personal', ownerId: OWNER, shortName: 'mgmt'},
          name: 'mgmt',
          resourceGroups: [],
          parameters: {},
          status: 'Active',
        },
      },
    ];
    const env = await cloud.environments.get({
      type: 'Personal',
      ownerId: OWNER,
      shortName: 'mgmt',
    });
    expect(env?.managementEnvironmentId).toBeNull();
    expect(env?.defaultCiCdProfileShortName).toBeNull();
  });
});

describe('cloud.environments.deploy() — review hardening', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  const AGENT = {
    provider: 'AZURE',
    region: 'westeurope',
    tenantId: 'tenant-1',
    subscriptionId: 'sub-mgmt',
  };
  const opTree = () =>
    mgmtOnly().withOperationalEnvironment(
      OperationalEnvironment({shortName: 'prod', resourceGroups: [rg('prod-rg')]})
        .withAzureSubscription({region: 'northeurope', subscriptionId: 'sub-p'})
        .withNetworkTier('prod'),
    );
  const storedMgmt = (parameters: Record<string, unknown>) => ({
    status: 200,
    body: {
      id: {type: 'Personal', ownerId: OWNER, shortName: 'mgmt'},
      name: 'mgmt',
      resourceGroups: [rg('mgmt-rg')],
      parameters,
      status: 'Active',
    },
  });

  it('refuses an operational tier the STORED management tier overrides, before writing it', async () => {
    h.state.queue = [storedMgmt({agents: [AGENT], NetworkTier: 'nonprod'})];
    await expect(
      cloud.environments.deploy(opTree(), {quiet: true, providerCredentials}),
    ).rejects.toThrow(
      /'prod' would be ignored .* stores networkTier 'nonprod'.*withParameter\('networkTier', null\)/s,
    );
    // Only the management env was read; nothing was written for prod.
    expect(h.requests.map(r => r.method)).toEqual(['GET']);
  });

  it('refuses a stored-tier conflict on a LATER operational env before writing any env', async () => {
    h.state.queue = [storedMgmt({agents: [AGENT], networkTier: 'nonprod'})];
    await expect(
      cloud.environments.deploy(
        mgmtOnly()
          .withParameter('owner', 'platform') // drift on mgmt → would PUT
          .withOperationalEnvironment(
            OperationalEnvironment({
              shortName: 'dev',
              resourceGroups: [rg('dev-rg')],
            }).withAzureSubscription({
              region: 'northeurope',
              subscriptionId: 'sub-d',
            }),
          )
          .withOperationalEnvironment(
            OperationalEnvironment({
              shortName: 'prod',
              resourceGroups: [rg('prod-rg')],
            })
              .withAzureSubscription({
                region: 'northeurope',
                subscriptionId: 'sub-p',
              })
              .withNetworkTier('prod'),
          ),
        {quiet: true, providerCredentials},
      ),
    ).rejects.toThrow(/'prod' would be ignored/);
    // Only the management env was read — neither mgmt's PUT nor dev's write ran.
    expect(h.requests.map(r => r.method)).toEqual(['GET']);
  });

  it('accepts an operational tier once the management tier is declared absent', async () => {
    h.state.queue = [
      storedMgmt({agents: [AGENT], networkTier: 'nonprod'}),
      {status: 200}, // PUT mgmt removing networkTier
      {status: 404}, // fetch prod
      {status: 201}, // create prod
      {status: 200, body: {initializationRun: {status: 'Completed'}}}, // mgmt
      {status: 404}, // prod status
      {status: 202}, // prod initialize
    ];
    await cloud.environments.deploy(
      opTree().withParameter('networkTier', null),
      {quiet: true, providerCredentials},
    );
    const put = h.requests.find(r => r.method === 'PUT');
    expect((put!.body as {parameters: unknown}).parameters).toEqual({
      agents: [AGENT],
    });
  });

  it('reinitializeAgents under fire-and-forget refuses operational inits it knows will fail', async () => {
    h.state.queue = [
      storedMgmt({agents: [AGENT]}),
      {
        status: 200, // fetch prod → up to date
        body: {
          id: {type: 'Personal', ownerId: OWNER, shortName: 'prod'},
          name: 'prod',
          resourceGroups: [rg('prod-rg')],
          parameters: {
            agents: [
              {...AGENT, region: 'northeurope', subscriptionId: 'sub-p'},
            ],
            networkTier: 'prod',
          },
          status: 'Active',
        },
      },
      {status: 200, body: {initializationRun: {status: 'Completed'}}}, // mgmt
      {status: 202}, // forced mgmt initialize
      {status: 200, body: {initializationRun: {status: 'Completed'}}}, // prod
    ];
    await expect(
      cloud.environments.deploy(opTree(), {
        quiet: true,
        providerCredentials,
        reinitializeAgents: true,
      }),
    ).rejects.toThrow(/agentInit: 'wait'/);
    const inits = h.requests.filter(r => r.url.endsWith('/initialize'));
    expect(inits).toHaveLength(1);
  });

  it('wraps a throwing resolver with the environment id', async () => {
    h.state.queue = [{status: 404}, {status: 201}, {status: 404}];
    await expect(
      cloud.environments.deploy(mgmtOnly(), {
        quiet: true,
        providerCredentials: () => {
          throw new Error('sts:AssumeRole denied');
        },
      }),
    ).rejects.toThrow(
      /resolver failed for the AZURE agent of environment 'Personal\/[^']+\/mgmt': sts:AssumeRole denied/,
    );
  });

  it('logs which stored builder-owned keys it keeps', async () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((m: string) => {
      lines.push(m);
    });
    try {
      h.state.queue = [
        storedMgmt({agents: [AGENT], tags: {team: 'x'}}),
        {status: 200, body: {initializationRun: {status: 'Completed'}}},
      ];
      await cloud.environments.deploy(mgmtOnly(), {providerCredentials});
    } finally {
      spy.mockRestore();
    }
    expect(
      lines.some(l => /Keeping stored parameters .* keys=tags/.test(l)),
    ).toBe(true);
  });
});

describe('cloud.environments.list() / get() — response validation', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });
  const owner = {type: 'Personal' as const, ownerId: OWNER};
  const id = {type: 'Personal' as const, ownerId: OWNER, shortName: 'prod'};
  const goodId = {type: 'Personal', ownerId: OWNER, shortName: 'prod'};

  it.each([
    [{rows: 'nope'}, /body is not an array/],
    [['x'], /\[0\] is not an object/],
    [[{name: 'n'}], /\[0\]\.id is not an environment id/],
    [[{id: {type: 'Personal', ownerId: 7, shortName: 's'}}], /\[0\]\.id is not/],
    [[{id: goodId, name: 3}], /\[0\]\.name is not a string/],
    [[{id: goodId, resourceGroups: 'rg'}], /\[0\]\.resourceGroups is not an array of strings/],
    [[{id: goodId, initializedClouds: [1]}], /\[0\]\.initializedClouds is not an array of strings/],
  ])('list rejects %j', async (body, error) => {
    h.state.queue = [{status: 200, body}];
    const err = await cloud.environments.list(owner).then(
      () => new Error('resolved'),
      (e: Error) => e,
    );
    expect(err.message).toMatch(error);
    expect(err.message).toMatch(
      /^Unexpected response from GET \/environments\/\{type\}\/\{ownerId\}:/,
    );
  });

  it.each([
    ['not-an-object', /body is not an object/],
    [{name: 'n'}, /: id is not an environment id/],
    [{id: goodId, managementEnvironmentId: 'mgmt'}, /managementEnvironmentId is not an environment id/],
    [{id: goodId, parameters: []}, /parameters is not an object/],
    [{id: goodId, status: 1}, /status is not a string/],
    [{id: goodId, defaultCiCdProfileShortName: {}}, /defaultCiCdProfileShortName is not a string/],
  ])('get rejects %j', async (body, error) => {
    h.state.queue = [{status: 200, body}];
    await expect(cloud.environments.get(id)).rejects.toThrow(error);
  });

  it('get accepts a minimal valid body, defaulting the optional fields', async () => {
    h.state.queue = [{status: 200, body: {id: goodId}}];
    expect(await cloud.environments.get(id)).toEqual({
      id: goodId,
      managementEnvironmentId: null,
      name: '',
      status: 'Unknown',
      resourceGroups: [],
      parameters: {},
      defaultCiCdProfileShortName: null,
    });
  });
});
