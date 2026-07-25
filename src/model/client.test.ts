/**
 * client.test.ts — the Fractal Cloud client surface, with a mocked HTTP layer.
 *
 * Blueprint (Fractal) registration and LiveSystem deployment are SEGREGATED
 * operations on two namespaces. The blueprint carries ABSTRACT component
 * contracts (Level 1, e.g. `Storage.ObjectStorage`); only the LiveSystem carries
 * the resolved offers (`Storage.PaaS.AwsS3` + provider/deliveryModel).
 */
import {describe, it, expect, beforeEach, vi} from 'vitest';

const h = vi.hoisted(() => {
  const requests: {method: string; url: string; body?: unknown}[] = [];
  // `throws` makes the queued response reject, the way superagent surfaces a
  // non-2xx it was not told to tolerate.
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
import type {PublishableFractal} from './core';
import {
  ObjectStorage,
  RelationalDbms,
  RelationalDatabase,
} from './components/storage';
import {AwsS3} from './offers/storage';
import {ManagementEnvironment} from './environment/index';
import {createFractalCloudClient} from './client';

const creds = {clientId: 'cid', clientSecret: 'secret'};
const OWNER = '00000000-0000-0000-0000-000000000001';
const BP_URL = `https://api.fractal.cloud/blueprints/Personal/${OWNER}/reusable-templates/basic-storage/1.0.0`;
const LS_URL = `https://api.fractal.cloud/livesystems/Personal/${OWNER}/reusable-templates/acme-storage`;

function storageFractal() {
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
  });
}

/** A Fractal whose interface both ADDS components (addChild) and SETS parameters —
 *  the two ways an operation could leak application intent into a blueprint. */
function dbmsFractal() {
  return createFractal({
    id: 'app-db',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId: {
      ownerType: 'Personal',
      ownerId: OWNER,
      name: 'reusable-templates',
    },
    blueprint: bp => ({
      dbms: bp.add(RelationalDbms({id: 'app-dbms'}).withEngineVersion('16')),
    }),
    operations: s => ({
      withDatabases: (names: string[]) => {
        const adds = names.map(name =>
          s.dbms.addChild(RelationalDatabase({id: name})),
        );
        return st => adds.reduce((acc, add) => add(acc), st);
      },
      withCharset: (charset: string) => s.dbms.set('charset', charset),
    }),
  });
}

function storageLiveSystem() {
  return storageFractal().toLiveSystem({
    name: 'acme-storage',
    environment: {ownerType: 'Personal', ownerId: OWNER, name: 'dev'},
    select: {uploads: AwsS3({region: 'us-east-1'})},
  });
}

type BlueprintBody = {
  description: string;
  isPrivate: boolean;
  components: Array<Record<string, unknown>>;
};

describe('blueprints.create', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  it('publishes ABSTRACT component contracts, never resolved offer types', async () => {
    h.state.queue = [{status: 404}, {status: 201}];
    const cloud = createFractalCloudClient(creds);

    await cloud.blueprints.create(storageFractal());

    expect(h.requests.map(r => r.method)).toEqual(['GET', 'POST']);
    expect(h.requests[1].url).toBe(BP_URL);
    const body = h.requests[1].body as BlueprintBody;
    expect(body.components).toHaveLength(1);
    const uploads = body.components[0];
    // The Level-1 Component tag — re-satisfiable by ANY vendor's offer.
    expect(uploads.type).toBe('Storage.ObjectStorage');
    expect(uploads.id).toBe('uploads');
    // Vendor identity belongs to the LiveSystem, not the blueprint.
    expect(uploads).not.toHaveProperty('provider');
    expect(uploads).not.toHaveProperty('deliveryModel');
    // Architect guardrails still flow with the contract.
    expect(uploads.parameters).toMatchObject({encryption: 'at-rest'});
  });

  it('refuses to publish a component carrying a resolved offer type', async () => {
    // A blueprint whose components name a service delivery model is vendor-locked
    // and can never be re-satisfied by another vendor's offer. Reject it outright
    // rather than registering a corrupt reusable artifact.
    const corrupted = {
      fractalName: 'basic-storage',
      version: {major: 1, minor: 0, patch: 0},
      boundedContext: {
        ownerType: 'Personal',
        ownerId: OWNER,
        name: 'reusable-templates',
      },
      description: '',
      blueprint: {
        fractalId: 'basic-storage:1.0.0',
        components: [
          {
            id: 'uploads',
            displayName: 'uploads',
            component: 'Storage.PaaS.AwsS3',
            parameters: {},
            locked: [],
            dependencies: [],
            links: [],
          },
        ],
      },
    };
    const cloud = createFractalCloudClient(creds);

    await expect(cloud.blueprints.create(corrupted)).rejects.toThrow(
      /Storage\.PaaS\.AwsS3/,
    );
    // Nothing reached the control plane — the guard runs before any request.
    expect(h.requests).toEqual([]);
  });

  it('updates the blueprint in place when that version already exists', async () => {
    h.state.queue = [{status: 200}, {status: 200}];
    const cloud = createFractalCloudClient(creds);

    await cloud.blueprints.create(storageFractal());

    expect(h.requests.map(r => `${r.method} ${r.url}`)).toEqual([
      `GET ${BP_URL}`,
      `PUT ${BP_URL}`,
    ]);
  });

  it('publishes the BASE contracts even after the fractal was specialized', async () => {
    // The registered blueprint is the reusable artifact. Operations are one
    // application's intent: if their output reached the blueprint, the next team
    // to instantiate this Fractal would inherit that application's components and
    // parameters. Specializing must therefore not change what gets registered.
    const fractal = dbmsFractal();
    fractal
      .specialize()
      .withDatabases(['orders', 'audit'])
      .withCharset('LATIN1');

    h.state.queue = [{status: 404}, {status: 201}];
    const cloud = createFractalCloudClient(creds);
    await cloud.blueprints.create(fractal);

    const body = h.requests[1].body as BlueprintBody;
    // No 'orders' / 'audit' — op-added children stay out of the blueprint.
    expect(body.components.map(c => c.id)).toEqual(['app-dbms']);
    // And the op-set parameter never overwrote the architect's guardrail.
    expect(body.components[0].parameters).toEqual({engineVersion: '16'});
  });

  it('carries dependencies and links into the published contract', async () => {
    // Links are agent wire contract ({componentId, settings}) and dependencies are
    // provisioning order. Both are part of the blueprint, not the offer, so a
    // regression that dropped or reshaped them here would corrupt every consumer.
    const linked = createFractal({
      id: 'linked-app',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId: {
        ownerType: 'Personal',
        ownerId: OWNER,
        name: 'reusable-templates',
      },
      blueprint: bp => {
        const dbms = bp.add(RelationalDbms({id: 'app-dbms'}));
        const uploads = bp.add(ObjectStorage({id: 'uploads'}));
        bp.link(uploads, dbms, {access: 'read-write'});
        return {dbms, uploads};
      },
    });

    h.state.queue = [{status: 404}, {status: 201}];
    const cloud = createFractalCloudClient(creds);
    await cloud.blueprints.create(linked);

    const body = h.requests[1].body as BlueprintBody;
    const uploads = body.components.find(c => c.id === 'uploads')!;
    expect(uploads.links).toEqual([
      {componentId: 'app-dbms', settings: {access: 'read-write'}},
    ]);
    // A component with no links still carries the field, as an empty list.
    const dbms = body.components.find(c => c.id === 'app-dbms')!;
    expect(dbms.links).toEqual([]);
    expect(dbms.dependencies).toEqual([]);
  });

  it('registers the Fractal as private when asked', async () => {
    h.state.queue = [{status: 404}, {status: 201}];
    const cloud = createFractalCloudClient(creds);

    await cloud.blueprints.create(storageFractal(), {isPrivate: true});

    expect((h.requests[1].body as BlueprintBody).isPrivate).toBe(true);
  });

  it('rejects a SPECIALIZED fractal at compile time', () => {
    const specialized = storageFractal().specialize();
    const publish = (f: PublishableFractal) => f.fractalName;
    // @ts-expect-error — specialization is application-level intent; publishing it
    // would bake one application's choices into a reusable artifact.
    expect(() => publish(specialized)).toBeTypeOf('function');
  });
});

describe('liveSystems.deploy', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  it('never registers a blueprint as a side effect', async () => {
    h.state.queue = [{status: 404}, {status: 201}];
    const cloud = createFractalCloudClient(creds);

    await cloud.liveSystems.deploy(storageLiveSystem());

    // Exactly the LiveSystem round-trip: existence probe, then create.
    expect(h.requests.map(r => `${r.method} ${r.url}`)).toEqual([
      `GET ${LS_URL}`,
      'POST https://api.fractal.cloud/livesystems',
    ]);
    expect(h.requests.some(r => r.url.includes('/blueprints/'))).toBe(false);
  });

  it('explains the missing-blueprint failure instead of leaking an HTTP error', async () => {
    // Deploy no longer registers the blueprint, so this is now a reachable
    // first-run failure. The raw API error names neither the cause nor the fix.
    h.state.queue = [
      {status: 404}, // LS existence probe
      {
        throws: {
          status: 400,
          response: {body: {reasonCode: 'BlueprintDoesNotExist'}},
        },
      },
    ];
    const cloud = createFractalCloudClient(creds);

    await expect(cloud.liveSystems.deploy(storageLiveSystem())).rejects.toThrow(
      /cloud\.blueprints\.create\(fractal\)/,
    );
  });

  it('leaves an unrelated API error untouched', async () => {
    h.state.queue = [
      {status: 404},
      {throws: {status: 403, response: {body: {reasonCode: 'Forbidden'}}}},
    ];
    const cloud = createFractalCloudClient(creds);

    await expect(
      cloud.liveSystems.deploy(storageLiveSystem()),
    ).rejects.toMatchObject({status: 403});
  });
});

describe('baseUrl override', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  it('targets a non-production control plane for every namespace', async () => {
    const cloud = createFractalCloudClient({
      ...creds,
      // Trailing slash is tolerated — it must not produce a doubled separator.
      baseUrl: 'https://staging.fractal.cloud/',
    });

    h.state.queue = [{status: 404}, {status: 201}];
    await cloud.blueprints.create(storageFractal());
    h.state.queue = [{status: 404}, {status: 201}];
    await cloud.liveSystems.deploy(storageLiveSystem());

    expect(h.requests.map(r => r.url)).toEqual([
      `https://staging.fractal.cloud/blueprints/Personal/${OWNER}/reusable-templates/basic-storage/1.0.0`,
      `https://staging.fractal.cloud/blueprints/Personal/${OWNER}/reusable-templates/basic-storage/1.0.0`,
      `https://staging.fractal.cloud/livesystems/Personal/${OWNER}/reusable-templates/acme-storage`,
      'https://staging.fractal.cloud/livesystems',
    ]);
  });
});

describe('environments.deploy', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  it('deploys an environment tree with credentials held by the client', async () => {
    h.state.queue = [
      {status: 404}, // fetch env → create
      {status: 201}, // create env
      {status: 404}, // agent init status → needs start
      {status: 202}, // initialize
    ];
    const cloud = createFractalCloudClient(creds);

    await cloud.environments.deploy(
      ManagementEnvironment({
        id: {type: 'Personal', ownerId: OWNER, shortName: 'mgmt'},
        resourceGroups: [`Personal/${OWNER}/mgmt-rg`],
      }).withAzureCloudAgent({
        region: 'westeurope',
        tenantId: 'tenant-1',
        subscriptionId: 'sub-mgmt',
      }),
      {
        quiet: true,
        providerCredentials: {
          azure: {spClientId: 'sp-id', spClientSecret: 'sp-secret'},
        },
      },
    );

    expect(h.requests.map(r => r.method)).toEqual([
      'GET',
      'POST',
      'GET',
      'POST',
    ]);
    expect(h.requests[1].url).toBe(
      `https://api.fractal.cloud/environments/Personal/${OWNER}/mgmt`,
    );
  });
});
