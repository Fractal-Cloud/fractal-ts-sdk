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
  const state = {
    queue: [] as {status?: number; body?: unknown; throws?: unknown}[],
  };
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

import {createFractal} from './core';
import {ObjectStorage} from './components/storage';
import {AwsS3} from './offers/storage';
import {createFractalCloudClient} from './client';
import {referenceTo} from './reference';
import {LiveSystemValidationError} from './validation/live_system_validation_error';

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
      uploads: bp.add(ObjectStorage({id: 'uploads'}).withRetentionDays(30)),
    }),
  }).toLiveSystem({
    name: 'acme-storage',
    environment: {ownerType: 'Personal', ownerId: OWNER, name: 'dev'},
    select: {uploads: AwsS3({region: 'us-east-1'})},
  });
}

/** The control plane's answer when every component's parameters satisfy their contracts. */
const VALID = {
  status: 200,
  body: {
    valid: true,
    enforced: true,
    summary: {errors: 0, warnings: 0, blocking: 0, unvalidatedComponents: 0},
    liveSystemIssues: [],
    components: [],
  },
};

describe('liveSystems.deploy()', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  it('fire-and-forget: creates (POST) and returns without polling', async () => {
    h.state.queue = [{status: 404}, VALID, {status: 201}];
    await cloud.liveSystems.deploy(liveSystem()); // default mode

    expect(h.requests.map(r => `${r.method} ${r.url}`)).toEqual([
      `GET ${LS_URL}`, // existence probe
      'POST https://api.fractal.cloud/livesystems/validate', // validation
      'POST https://api.fractal.cloud/livesystems', // create, no poll
    ]);
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
    expect(body.blueprintMap.uploads.parameters.lifecycleExpirationDays).toBe(
      30,
    );
    expect(body.environment.id).toEqual({
      type: 'Personal',
      ownerId: OWNER,
      shortName: 'dev',
    });
  });

  it('wait: submits, polls until Active, and resolves to the LiveSystem state', async () => {
    h.state.queue = [
      {status: 404}, // LS existence
      VALID, // validation
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

  it('outputs: a structured output field arrives as its JSON', async () => {
    h.state.queue = [
      {
        status: 200,
        body: {
          status: 'Active',
          components: [
            {
              id: 'edge',
              status: 'Instantiating',
              outputFields: {
                structured: [{name: 'a', value: 1}],
                names: ['a', 'b'],
                // The CloudFront offer publishes its records as JSON text already: passed through.
                certificateValidationRecords:
                  '[{"name":"_a1.example.com.","type":"CNAME","value":"_b2.acm-validations.aws."}]',
              },
            },
          ],
        },
      },
    ];
    const state = await cloud.liveSystems.outputs(liveSystem());
    const fields = state.components.edge.outputFields;
    expect(JSON.parse(fields.structured)).toEqual([{name: 'a', value: 1}]);
    expect(fields.names).toBe('["a","b"]');
    expect(JSON.parse(fields.certificateValidationRecords)).toEqual([
      {
        name: '_a1.example.com.',
        type: 'CNAME',
        value: '_b2.acm-validations.aws.',
      },
    ]);
  });

  it('wait: throws on terminal failure status', async () => {
    h.state.queue = [
      {status: 404}, // LS existence
      VALID, // validation
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
    h.state.queue = [{status: 200}, VALID, {status: 200}];
    await cloud.liveSystems.deploy(liveSystem());
    expect(h.requests.map(r => `${r.method} ${r.url}`)).toEqual([
      `GET ${LS_URL}`,
      `POST ${LS_URL}/validate`,
      `PUT ${LS_URL}`,
    ]);
  });

  const issue = (severity: 'error' | 'warn', message: string) => ({
    severity,
    blocking: severity === 'error',
    code: severity === 'error' ? 'required' : 'unknownParameter',
    ruleId: null,
    field: '/bucket',
    relatedFields: [],
    detail: null,
    message,
    fix: {
      text: 'fix it',
      setField: null,
      allowedValues: null,
      example: null,
      requiredBecause: null,
    },
    docsUrl: null,
  });
  const result = (issues: ReturnType<typeof issue>[]) => ({
    status: 200,
    body: {
      valid: !issues.some(i => i.blocking),
      enforced: true,
      summary: {
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warn').length,
        blocking: issues.filter(i => i.blocking).length,
        unvalidatedComponents: 0,
      },
      liveSystemIssues: [],
      components: [
        {
          componentId: 'uploads',
          offerType: 'Storage.PaaS.AwsS3',
          provider: 'AWS',
          contract: {
            schemaVersion: '2.0',
            digest: null,
            declaredBy: 'fractal-cloud-agent-aws',
            agentVersion: 'v8.25.2',
          },
          validated: true,
          unvalidatedReason: null,
          fields: [{field: '/bucket', issues}],
        },
      ],
    },
  });

  it('refuses the deploy before submitting when validation finds a blocking issue', async () => {
    h.state.queue = [
      {status: 404},
      result([issue('error', 'bucket is required.')]),
    ];
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const deploy = cloud.liveSystems.deploy(liveSystem(), {mode: 'wait'});
    await expect(deploy).rejects.toBeInstanceOf(LiveSystemValidationError);
    await expect(deploy).rejects.toThrow(
      `Live System 'Personal/${OWNER}/reusable-templates/acme-storage' failed parameter validation: uploads /bucket: bucket is required.`,
    );
    expect(h.requests.map(r => r.method)).toEqual(['GET', 'POST']); // nothing submitted
    const lines = log.mock.calls.map(c => String(c[0]));
    expect(
      lines.some(l =>
        /ERROR Live System validation failed {2}system=\S+ errors=1 warnings=0$/.test(
          l,
        ),
      ),
    ).toBe(true);
    log.mockRestore();
  });

  it('logs each warning in wait mode and deploys', async () => {
    h.state.queue = [
      {status: 404},
      result([issue('warn', 'bucket is not read by the agent.')]),
      {status: 201},
      {status: 200, body: {status: 'Active'}},
      {status: 200, body: {status: 'Active', components: []}},
    ];
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await cloud.liveSystems.deploy(liveSystem(), {
      mode: 'wait',
      pollIntervalMs: 1,
      timeoutMs: 5000,
    });
    const lines = log.mock.calls.map(c => String(c[0]));
    expect(
      lines.some(
        l =>
          l.includes(
            'WARN  Live System validation warning: bucket is not read by the agent.  system=',
          ) &&
          l.endsWith('component=uploads field=/bucket code=unknownParameter'),
      ),
    ).toBe(true);
    log.mockRestore();
  });

  it('logs an error the control plane reports but does not enforce, and deploys', async () => {
    const reported = {
      ...issue('error', 'bucket is not a bucket name.'),
      blocking: false,
      code: 'pattern',
    };
    h.state.queue = [
      {status: 404},
      result([reported]),
      {status: 201},
      {status: 200, body: {status: 'Active'}},
      {status: 200, body: {status: 'Active', components: []}},
    ];
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await cloud.liveSystems.deploy(liveSystem(), {
      mode: 'wait',
      pollIntervalMs: 1,
      timeoutMs: 5000,
    });
    const lines = log.mock.calls.map(c => String(c[0]));
    expect(
      lines.some(
        l =>
          l.includes(
            'WARN  Live System validation error (not enforced): bucket is not a bucket name.  system=',
          ) && l.endsWith('component=uploads field=/bucket code=pattern'),
      ),
    ).toBe(true);
    log.mockRestore();
  });

  it('refuses silently in fire-and-forget, and logs nothing', async () => {
    h.state.queue = [
      {status: 404},
      result([issue('error', 'bucket is required.')]),
    ];
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(cloud.liveSystems.deploy(liveSystem())).rejects.toBeInstanceOf(
      LiveSystemValidationError,
    );
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('submits unchecked, with a warning, when the control plane offers no validation', async () => {
    h.state.queue = [
      {status: 404},
      {status: 404}, // an older control plane: no validate route
      {status: 201},
      {status: 200, body: {status: 'Active'}},
      {status: 200, body: {status: 'Active', components: []}},
    ];
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await cloud.liveSystems.deploy(liveSystem(), {
      mode: 'wait',
      pollIntervalMs: 1,
      timeoutMs: 5000,
    });
    expect(h.requests.map(r => r.method)).toEqual([
      'GET',
      'POST',
      'POST',
      'GET',
      'GET',
    ]);
    expect(
      log.mock.calls.some(c =>
        String(c[0]).includes(
          'WARN  Live System validation unavailable, submitting',
        ),
      ),
    ).toBe(true);
    log.mockRestore();
  });

  it('skips validation when asked', async () => {
    h.state.queue = [{status: 404}, {status: 201}];
    await cloud.liveSystems.deploy(liveSystem(), {
      mode: 'fire-and-forget',
      skipValidation: true,
    });
    expect(h.requests.map(r => r.method)).toEqual(['GET', 'POST']);
  });

  it('turns an OfferParametersInvalid refusal of the create into a LiveSystemValidationError', async () => {
    h.state.queue = [
      {status: 404},
      VALID,
      {
        throws: {
          status: 400,
          response: {
            status: 400,
            body: {
              reasonCode: 'OfferParametersInvalid',
              message: 'uploads: bucket is required',
            },
          },
        },
      },
    ];
    await expect(cloud.liveSystems.deploy(liveSystem())).rejects.toBeInstanceOf(
      LiveSystemValidationError,
    );
  });

  it('validate: returns the result without deploying', async () => {
    h.state.queue = [{status: 200}, result([issue('warn', 'unread.')])];
    const answer = await cloud.liveSystems.validate(liveSystem());
    expect(answer?.summary.warnings).toBe(1);
    expect(h.requests.map(r => `${r.method} ${r.url}`)).toEqual([
      `GET ${LS_URL}`,
      `POST ${LS_URL}/validate`,
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

describe('liveSystems.deploy() with a cross-Live-System reference', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  const referencing = () =>
    createFractal({
      id: 'bucket-consumer',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId: {
        ownerType: 'Personal',
        ownerId: OWNER,
        name: 'reusable-templates',
      },
      blueprint: bp => ({
        uploads: bp.add(ObjectStorage({id: 'uploads'}).withRetentionDays(30)),
      }),
    }).toLiveSystem({
      name: 'acme-consumer',
      environment: {ownerType: 'Personal', ownerId: OWNER, name: 'dev'},
      select: {
        uploads: referenceTo(AwsS3, {
          liveSystemId: `Personal/${OWNER}/reusable-templates/acme-storage`,
          componentId: 'uploads',
        }),
      },
    });

  it('carries `reference` unchanged, with no parameters, dependencies or links', async () => {
    h.state.queue = [{status: 404}, {status: 201}];
    await cloud.liveSystems.deploy(referencing());
    const post = h.requests.find(r => r.method === 'POST')!;
    const body = post.body as {blueprintMap: Record<string, unknown>};
    expect(body.blueprintMap.uploads).toEqual({
      type: 'Storage.PaaS.AwsS3',
      id: 'uploads',
      displayName: 'uploads',
      provider: 'AWS',
      deliveryModel: 'PaaS',
      reference: {
        liveSystemId: `Personal/${OWNER}/reusable-templates/acme-storage`,
        componentId: 'uploads',
      },
      parameters: {},
      dependencies: [],
      links: [],
    });
  });

  it('a component without a reference has no `reference` key in the body', async () => {
    h.state.queue = [{status: 404}, {status: 201}];
    await cloud.liveSystems.deploy(liveSystem());
    const post = h.requests.find(r => r.method === 'POST')!;
    const body = post.body as {blueprintMap: Record<string, object>};
    expect('reference' in body.blueprintMap.uploads).toBe(false);
  });
});
