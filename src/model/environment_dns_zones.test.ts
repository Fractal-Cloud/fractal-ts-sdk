/**
 * environment_dns_zones.test.ts — cloud.environments.dnsZones() with a mocked
 * HTTP client.
 *
 * Proves the read of `GET /environments/{type}/{ownerId}/{shortName}/dns-zones`
 * WITHOUT a live API: the request, the mapping of each zone into a list of
 * per-provider results (provider, status, zoneId, nameServers, dsRecords), the
 * assigned-but-unreported provider, a missing environment, and the refusal of a
 * body this SDK cannot map.
 */
import {describe, it, expect, beforeEach, vi} from 'vitest';

const h = vi.hoisted(() => {
  const requests: {
    method: string;
    url: string;
    headers: Record<string, string>;
  }[] = [];
  const state = {queue: [] as {status: number; body?: unknown}[]};
  return {requests, state};
});

vi.mock('superagent', () => {
  const make = (method: string, url: string) => {
    const req: Record<string, unknown> = {headers: {}};
    let okFn: (r: {status: number}) => boolean = r => r.status < 300;
    req.ok = (f: (r: {status: number}) => boolean) => {
      okFn = f;
      return req;
    };
    req.set = (headers: Record<string, string>) => {
      Object.assign(req.headers as Record<string, string>, headers);
      return req;
    };
    req.then = (
      resolve: (v: unknown) => unknown,
      reject: (e: unknown) => unknown,
    ) => {
      h.requests.push({
        method,
        url,
        headers: {...(req.headers as Record<string, string>)},
      });
      const next = h.state.queue.shift() ?? {status: 200, body: {}};
      if (!okFn(next)) {
        // superagent rejects a status its ok() predicate refuses.
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
    },
  };
});

import {createFractalCloudClient} from './client';

const cloud = createFractalCloudClient({
  clientId: 'cid',
  clientSecret: 'secret',
});
const OWNER = '2e114308-14ec-4d77-b610-490324fa1844';
const id = {type: 'Organizational' as const, ownerId: OWNER, shortName: 'prod'};
const DS = {keyTag: 12345, algorithm: 13, digestType: 2, digest: 'ABCDEF0123'};

const awsActive = {
  provider: 'Aws',
  status: 'Active',
  message: '',
  outputs: {
    zoneId: 'Z0123456789',
    nameServers: ['ns-1.awsdns-01.org', 'ns-2.awsdns-02.co.uk'],
    dsRecords: [DS],
    managedRecords: ['www A'],
  },
  updatedAt: '2026-10-01T12:00:00+00:00',
};

describe('cloud.environments.dnsZones()', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  it('calls GET .../dns-zones and maps each realization into a per-provider result', async () => {
    h.state.queue = [
      {
        status: 200,
        body: {
          zones: [
            {
              zoneName: 'example.com',
              declared: true,
              assignedProvider: 'Aws',
              unassigned: '',
              realizations: [awsActive],
            },
          ],
          problems: [],
        },
      },
    ];
    const result = await cloud.environments.dnsZones(id);
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0].method).toBe('GET');
    expect(h.requests[0].url).toBe(
      `https://api.fractal.cloud/environments/Organizational/${OWNER}/prod/dns-zones`,
    );
    expect(h.requests[0].headers['X-ClientID']).toBe('cid');
    expect(result).toEqual({
      zones: [
        {
          name: 'example.com',
          declared: true,
          unassignedReason: null,
          results: [
            {
              agent: 'aws',
              provider: 'AWS',
              assigned: true,
              status: 'Active',
              message: '',
              zoneId: 'Z0123456789',
              nameServers: ['ns-1.awsdns-01.org', 'ns-2.awsdns-02.co.uk'],
              dsRecords: [DS],
              outputs: awsActive.outputs,
              updatedAt: '2026-10-01T12:00:00+00:00',
            },
          ],
        },
      ],
      problems: [],
    });
  });

  it('reports an assigned provider that has not reported yet as Pending', async () => {
    h.state.queue = [
      {
        status: 200,
        body: {
          zones: [
            {
              zoneName: 'example.org',
              declared: true,
              assignedProvider: 'Gcp',
              unassigned: '',
              realizations: [],
            },
          ],
          problems: [],
        },
      },
    ];
    const result = await cloud.environments.dnsZones(id);
    expect(result?.zones[0].results).toEqual([
      {
        agent: 'gcp',
        provider: 'GCP',
        assigned: true,
        status: 'Pending',
        message: '',
        zoneId: null,
        nameServers: [],
        dsRecords: [],
        outputs: {},
        updatedAt: null,
      },
    ]);
  });

  it('keeps a realization of a provider no longer assigned, and the unassigned reason', async () => {
    h.state.queue = [
      {
        status: 200,
        body: {
          zones: [
            {
              zoneName: 'example.net',
              declared: true,
              assignedProvider: '',
              unassigned:
                'the environment has agents for several DNS providers; set dnsZoneType',
              realizations: [
                {
                  provider: 'Azure',
                  status: 'Failed',
                  message: 'guardrail violation',
                  outputs: {},
                  updatedAt: '2026-10-01T12:00:00+00:00',
                },
              ],
            },
            {
              zoneName: 'old.example.com',
              declared: false,
              assignedProvider: '',
              unassigned: '',
              realizations: [{...awsActive, status: 'Deleting'}],
            },
          ],
          problems: ["dnsZones[2]: 'example.net' is declared twice"],
        },
      },
    ];
    const result = await cloud.environments.dnsZones(id);
    expect(result?.problems).toEqual([
      "dnsZones[2]: 'example.net' is declared twice",
    ]);
    const [held, retired] = result!.zones;
    expect(held.unassignedReason).toMatch(/set dnsZoneType/);
    expect(held.results).toEqual([
      {
        agent: 'azure',
        provider: 'Azure',
        assigned: false,
        status: 'Failed',
        message: 'guardrail violation',
        zoneId: null,
        nameServers: [],
        dsRecords: [],
        outputs: {},
        updatedAt: '2026-10-01T12:00:00+00:00',
      },
    ]);
    expect(retired.declared).toBe(false);
    expect(retired.unassignedReason).toBeNull();
    expect(
      retired.results.map(r => [r.provider, r.assigned, r.status]),
    ).toEqual([['AWS', false, 'Deleting']]);
  });

  it('carries several providers of one zone, one result each', async () => {
    h.state.queue = [
      {
        status: 200,
        body: {
          zones: [
            {
              zoneName: 'example.com',
              declared: true,
              assignedProviders: ['Aws', 'Gcp', 'Azure'],
              realizations: [
                awsActive,
                {
                  provider: 'Gcp',
                  status: 'Realizing',
                  message: '',
                  outputs: {zoneId: 'example-com', nameServers: []},
                  updatedAt: '2026-10-01T12:01:00+00:00',
                },
              ],
            },
          ],
          problems: [],
        },
      },
    ];
    const result = await cloud.environments.dnsZones(id);
    expect(
      result?.zones[0].results.map(r => [
        r.provider,
        r.assigned,
        r.status,
        r.zoneId,
      ]),
    ).toEqual([
      ['AWS', true, 'Active', 'Z0123456789'],
      ['GCP', true, 'Realizing', 'example-com'],
      ['Azure', true, 'Pending', null],
    ]);
  });

  it('keys each result by agent, two agents of one type included', async () => {
    h.state.queue = [
      {
        status: 200,
        body: {
          zones: [
            {
              zoneName: 'example.com',
              declared: true,
              assignedAgents: ['aws', 'aria:aruba', 'aria:caas-k8s'],
              assignedProviders: ['Aws', 'Aria'],
              realizations: [
                {...awsActive, agent: 'aws'},
                {...awsActive, provider: 'Aria', agent: 'aria:aruba'},
              ],
            },
          ],
          problems: [],
        },
      },
    ];
    const result = await cloud.environments.dnsZones(id);
    expect(
      result?.zones[0].results.map(r => [r.agent, r.provider, r.assigned, r.status]),
    ).toEqual([
      ['aws', 'AWS', true, 'Active'],
      ['aria:aruba', 'Aria', true, 'Active'],
      ['aria:caas-k8s', 'Aria', true, 'Pending'],
    ]);
  });

  it('returns an environment with no zones as an empty list', async () => {
    h.state.queue = [{status: 200, body: {zones: [], problems: []}}];
    expect(await cloud.environments.dnsZones(id)).toEqual({
      zones: [],
      problems: [],
    });
  });

  it.each([
    [
      {outputs: {zoneId: 7, nameServers: ['ns-1']}},
      'outputs.zoneId is not a string',
      {zoneId: null, nameServers: ['ns-1']},
    ],
    [
      {outputs: {zoneId: 'Z1', nameServers: 'ns-1'}},
      'outputs.nameServers is not an array of strings',
      {zoneId: 'Z1', nameServers: []},
    ],
    [
      {outputs: {zoneId: 'Z1', dsRecords: [{...DS, keyTag: '12345'}]}},
      'outputs.dsRecords[0] is not a DS record {keyTag, algorithm, digestType, digest}',
      {zoneId: 'Z1', dsRecords: []},
    ],
    [
      {outputs: {zoneId: 'Z1', dsRecords: 'x'}},
      'outputs.dsRecords is not an array',
      {zoneId: 'Z1', dsRecords: []},
    ],
  ])(
    'degrades a malformed output of one agent report %j instead of failing the read',
    async (overrides, problem, expected) => {
      h.state.queue = [
        {
          status: 200,
          body: {
            zones: [
              {
                zoneName: 'good.example',
                declared: true,
                assignedProvider: 'Gcp',
                unassigned: '',
                realizations: [{...awsActive, provider: 'Gcp'}],
              },
              {
                zoneName: 'bad.example',
                declared: true,
                assignedProvider: 'Aws',
                unassigned: '',
                realizations: [{...awsActive, ...overrides}],
              },
            ],
            problems: ['declared twice'],
          },
        },
      ];
      const result = await cloud.environments.dnsZones(id);
      expect(result?.zones[0].results[0].nameServers).toEqual(
        awsActive.outputs.nameServers,
      );
      expect(result?.zones[1].results[0]).toMatchObject({
        status: 'Active',
        ...expected,
      });
      expect(result?.zones[1].results[0].outputs).toEqual(overrides.outputs);
      expect(result?.problems).toEqual([
        'declared twice',
        `bad.example (aws): zones[1].realizations[0].${problem}`,
      ]);
    },
  );

  it('falls back to assignedProvider when assignedProviders is empty', async () => {
    h.state.queue = [{status: 200, body: zone({assignedProviders: []})}];
    const result = await cloud.environments.dnsZones(id);
    expect(result?.zones[0].results.map(r => [r.provider, r.status])).toEqual([
      ['AWS', 'Pending'],
    ]);
  });

  it('propagates a 403 as an error that carries no credential', async () => {
    h.state.queue = [{status: 403}];
    const err = await cloud.environments.dnsZones(id).then(
      () => new Error('resolved'),
      (e: Error) => e,
    );
    expect(err.message).not.toBe('resolved');
    expect(err.message).toMatch(/403/);
    expect(err.message).not.toContain('secret');
  });

  it.each([
    [{ownerId: 'not-a-guid'}, /ownerId must be a GUID/],
    [
      {shortName: 'x'.repeat(31)},
      /shortName must not be longer than 30 characters/,
    ],
  ])(
    'refuses an id the server cannot route %j, instead of reading it as missing',
    async (overrides, error) => {
      await expect(
        cloud.environments.dnsZones({...id, ...overrides}),
      ).rejects.toThrow(error);
      expect(h.requests).toHaveLength(0);
    },
  );

  it('returns null for a missing environment', async () => {
    h.state.queue = [{status: 404}];
    expect(await cloud.environments.dnsZones(id)).toBeNull();
  });

  it('refuses a blank ownerId or shortName without calling the API', async () => {
    await expect(
      cloud.environments.dnsZones({...id, ownerId: ' '}),
    ).rejects.toThrow(/requires an ownerId/);
    await expect(
      cloud.environments.dnsZones({...id, shortName: ''}),
    ).rejects.toThrow(/requires a shortName/);
    expect(h.requests).toHaveLength(0);
  });

  it('percent-encodes the path segments', async () => {
    h.state.queue = [{status: 200, body: {zones: [], problems: []}}];
    await cloud.environments.dnsZones({...id, shortName: '../x'});
    expect(h.requests[0].url).toBe(
      `https://api.fractal.cloud/environments/Organizational/${OWNER}/..%2Fx/dns-zones`,
    );
  });

  const zone = (overrides: Record<string, unknown>) => ({
    zones: [
      {
        zoneName: 'example.com',
        declared: true,
        assignedProvider: 'Aws',
        unassigned: '',
        realizations: [],
        ...overrides,
      },
    ],
    problems: [],
  });
  const realization = (overrides: Record<string, unknown>) =>
    zone({realizations: [{...awsActive, ...overrides}]});

  it.each([
    ['not-an-object', /body is not an object/],
    [{zones: 'x'}, /zones is not an array/],
    [{zones: [], problems: [1]}, /problems is not an array of strings/],
    [{zones: ['x']}, /zones\[0\] is not an object/],
    [zone({zoneName: 3}), /zones\[0\]\.zoneName is not a string/],
    [zone({zoneName: ''}), /zones\[0\]\.zoneName is not a string/],
    [zone({declared: 'yes'}), /zones\[0\]\.declared is not a boolean/],
    [
      zone({assignedProvider: 1}),
      /zones\[0\]\.assignedProvider is not a string/,
    ],
    [
      zone({assignedProviders: 'Aws'}),
      /zones\[0\]\.assignedProviders is not an array of strings/,
    ],
    [zone({realizations: {}}), /zones\[0\]\.realizations is not an array/],
    [
      zone({realizations: [1]}),
      /zones\[0\]\.realizations\[0\] is not an object/,
    ],
    [
      realization({provider: ''}),
      /zones\[0\]\.realizations\[0\]\.provider is not a string/,
    ],
    [
      realization({status: 2}),
      /zones\[0\]\.realizations\[0\]\.status is not a string/,
    ],
    [
      realization({outputs: []}),
      /zones\[0\]\.realizations\[0\]\.outputs is not an object/,
    ],
  ])('rejects %j', async (body, error) => {
    h.state.queue = [{status: 200, body}];
    const err = await cloud.environments.dnsZones(id).then(
      () => new Error('resolved'),
      (e: Error) => e,
    );
    expect(err.message).toMatch(error);
    expect(err.message).toMatch(
      /^Unexpected response from GET \/environments\/\{type\}\/\{ownerId\}\/\{shortName\}\/dns-zones:/,
    );
  });

  it('passes an unknown provider or status through rather than failing', async () => {
    h.state.queue = [
      {
        status: 200,
        body: realization({provider: 'Oci', status: 'Suspended'}),
      },
    ];
    const result = await cloud.environments.dnsZones(id);
    expect(result?.zones[0].results.map(r => [r.provider, r.status])).toEqual([
      ['AWS', 'Pending'],
      ['Oci', 'Suspended'],
    ]);
  });

  it('copies the outputs, so a caller cannot mutate what the next read maps', async () => {
    h.state.queue = [{status: 200, body: realization({})}];
    const result = await cloud.environments.dnsZones(id);
    const r = result!.zones[0].results[0];
    r.nameServers.push('evil');
    r.dsRecords[0].digest = 'changed';
    expect(awsActive.outputs.nameServers).toHaveLength(2);
    expect(awsActive.outputs.dsRecords[0].digest).toBe('ABCDEF0123');
  });
});
