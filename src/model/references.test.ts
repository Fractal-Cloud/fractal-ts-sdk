/**
 * references.test.ts — executable spec for cross-Live-System references.
 *
 * A Live System may stand a slot in for a component another Live System owns —
 * a shared cluster, a shared DBMS, another service's topic. The slot is filled
 * with `referenceTo(offer, {liveSystemId, componentId})` instead of an offer:
 *   - the emitted component keeps the slot's LOCAL id and the offer's type,
 *     provider and delivery model, carries `reference`, and nothing else
 *     (no parameters, dependencies or links: the owner's are mirrored by the
 *     control plane, read-only);
 *   - everything in the referencing Live System that depends on or links to the
 *     slot names the LOCAL id;
 *   - the deploy body carries `reference` unchanged.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {ContainerPlatform} from './components/network_and_compute';
import {RelationalDbms, RelationalDatabase} from './components/storage';
import {Workload} from './components/custom_workloads';
import {MessagingEntity} from './components/messaging';
import {Eks} from './offers/network_and_compute';
import {
  AwsRdsPostgresDbms,
  AwsRdsPostgresDatabase,
  AwsS3,
} from './offers/storage';
import {K8sWorkload} from './offers/custom_workloads';
import {GcpPubSubTopic} from './offers/messaging';
import {referenceTo, liveSystemIdOf} from './reference';

const OWNER = '00000000-0000-0000-0000-0000000000aa';
const environment = {ownerType: 'Organizational', ownerId: OWNER, name: 'prod'};
const SHARED_PLATFORM = `Organizational/${OWNER}/platform/shared-platform`;

const fractal = () =>
  createFractal({
    id: 'domain-service',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId: {
      ownerType: 'Organizational',
      ownerId: OWNER,
      name: 'accounts',
    },
    blueprint: bp => {
      const cluster = bp.add(
        ContainerPlatform({id: 'cluster'}).withKubernetesVersion('1.33'),
      );
      const dbms = bp.add(RelationalDbms({id: 'dbms'}));
      const database = bp.add(
        RelationalDatabase({id: 'database'}).dependsOn(dbms),
      );
      const service = bp.add(Workload({id: 'service'}).dependsOn(cluster));
      bp.link(service, database, {access: 'read-write'});
      return {cluster, dbms, database, service};
    },
  });

const select = () => ({
  cluster: referenceTo(Eks({}), {
    liveSystemId: SHARED_PLATFORM,
    componentId: 'eks',
  }),
  dbms: referenceTo(AwsRdsPostgresDbms, {
    liveSystemId: SHARED_PLATFORM,
    componentId: 'postgres',
  }),
  database: AwsRdsPostgresDatabase({}),
  service: K8sWorkload({namespace: 'fractal'}),
});

describe('referenceTo — a slot standing in for another Live System component', () => {
  it('emits the slot under its local id with only the reference (no parameters, dependencies or links)', () => {
    const ls = fractal().toLiveSystem({
      name: 'accounts',
      environment,
      select: select(),
    });
    const cluster = ls.components.find(c => c.id === 'cluster')!;
    expect(cluster).toEqual({
      id: 'cluster',
      displayName: 'cluster',
      type: 'NetworkAndCompute.PaaS.AwsEks',
      provider: 'AWS',
      deliveryModel: 'PaaS',
      reference: {liveSystemId: SHARED_PLATFORM, componentId: 'eks'},
      parameters: {},
      dependencies: [],
      links: [],
    });
  });

  it('accepts an offer constructor as well as a configured offer', () => {
    const ls = fractal().toLiveSystem({
      name: 'accounts',
      environment,
      select: select(),
    });
    const dbms = ls.components.find(c => c.id === 'dbms')!;
    expect(dbms.type).toBe('Storage.PaaS.AwsRdsPostgres');
    expect(dbms.provider).toBe('AWS');
    expect(dbms.reference).toEqual({
      liveSystemId: SHARED_PLATFORM,
      componentId: 'postgres',
    });
    expect(dbms.parameters).toEqual({});
  });

  it('dependents and linkers of a referenced slot name its LOCAL id', () => {
    const ls = fractal().toLiveSystem({
      name: 'accounts',
      environment,
      select: select(),
    });
    const database = ls.components.find(c => c.id === 'database')!;
    const service = ls.components.find(c => c.id === 'service')!;
    expect(database.dependencies).toEqual(['dbms']);
    expect(database.reference).toBeUndefined();
    expect(service.dependencies).toEqual(['cluster']);
    expect(service.links).toEqual([
      {componentId: 'database', settings: {access: 'read-write'}},
    ]);
  });

  it('a component selected with a real offer carries no reference key at all', () => {
    const ls = fractal().toLiveSystem({
      name: 'accounts',
      environment,
      select: select(),
    });
    const service = ls.components.find(c => c.id === 'service')!;
    expect('reference' in service).toBe(false);
  });

  it('refuses an offer that does not satisfy the slot (type error AND throws)', () => {
    expect(() =>
      fractal().toLiveSystem({
        name: 'accounts',
        environment,
        select: {
          ...select(),
          // @ts-expect-error — an ObjectStorage offer cannot stand in for a ContainerPlatform
          cluster: referenceTo(AwsS3({}), {
            liveSystemId: SHARED_PLATFORM,
            componentId: 'eks',
          }),
        },
      }),
    ).toThrow(
      /does not satisfy component 'NetworkAndCompute.ContainerPlatform'/,
    );
  });

  it('refuses a referenced slot that carries outbound links (they would never be acted on)', () => {
    const f = createFractal({
      id: 'linked-reference',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId: {
        ownerType: 'Organizational',
        ownerId: OWNER,
        name: 'x',
      },
      blueprint: bp => {
        const topic = bp.add(MessagingEntity({id: 'topic'}));
        const other = bp.add(MessagingEntity({id: 'other'}));
        bp.link(topic, other, {access: 'publish'});
        return {topic, other};
      },
    });
    expect(() =>
      f.toLiveSystem({
        name: 'x',
        environment,
        select: {
          topic: referenceTo(GcpPubSubTopic({}), {
            liveSystemId: SHARED_PLATFORM,
            componentId: 'events',
          }),
          other: GcpPubSubTopic({}),
        },
      }),
    ).toThrow(/'topic' is a reference .* links to \[other\]/);
  });

  it('refuses a referenced slot that the application added child components under', () => {
    const f = createFractal({
      id: 'child-reference',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId: {
        ownerType: 'Organizational',
        ownerId: OWNER,
        name: 'x',
      },
      blueprint: bp => ({dbms: bp.add(RelationalDbms({id: 'dbms'}))}),
      operations: s => ({
        withDatabase: () => s.dbms.addChild(RelationalDatabase({id: 'db'})),
      }),
    });
    expect(() =>
      f
        .specialize()
        .withDatabase()
        .toLiveSystem({
          name: 'x',
          environment,
          select: {
            dbms: referenceTo(AwsRdsPostgresDbms, {
              liveSystemId: SHARED_PLATFORM,
              componentId: 'postgres',
            }),
          },
        }),
    ).toThrow(/'dbms' is a reference .* children \[db\]/);
  });

  it.each([
    ['an empty id', ''],
    ['one segment', 'shared-platform'],
    ['three segments', 'Organizational/x/shared-platform'],
    ['an empty segment', `Organizational//platform/shared-platform`],
    ['five segments', `Organizational/${OWNER}/platform/a/b`],
  ])('refuses a liveSystemId with %s', (_why, liveSystemId) => {
    expect(() =>
      referenceTo(Eks({}), {liveSystemId, componentId: 'eks'}),
    ).toThrow(/liveSystemId/);
  });

  it.each([
    ['empty', ''],
    ['holding a slash', 'a/b'],
  ])('refuses a componentId that is %s', (_why, componentId) => {
    expect(() =>
      referenceTo(Eks({}), {liveSystemId: SHARED_PLATFORM, componentId}),
    ).toThrow(/componentId/);
  });
});

describe('liveSystemIdOf — the id the control plane gives a Live System', () => {
  it('is <ownerType>/<ownerId>/<boundedContext>/<liveSystemName>', () => {
    expect(
      liveSystemIdOf(
        {ownerType: 'Organizational', ownerId: OWNER, name: 'platform'},
        'shared-platform',
      ),
    ).toBe(SHARED_PLATFORM);
  });

  it('is usable directly in referenceTo', () => {
    const ref = referenceTo(Eks({}), {
      liveSystemId: liveSystemIdOf(
        {ownerType: 'Personal', ownerId: OWNER, name: 'sandbox'},
        'cluster-ls',
      ),
      componentId: 'eks',
    });
    expect(ref.config).toEqual({
      liveSystemId: `Personal/${OWNER}/sandbox/cluster-ls`,
      componentId: 'eks',
    });
  });

  it.each([
    ['a missing owner type', {ownerId: OWNER, name: 'platform'}, 'ls'],
    [
      'a missing owner id',
      {ownerType: 'Organizational', name: 'platform'},
      'ls',
    ],
    [
      'a missing bounded context',
      {ownerType: 'Organizational', ownerId: OWNER},
      'ls',
    ],
    [
      'an empty name',
      {ownerType: 'Organizational', ownerId: OWNER, name: 'platform'},
      '',
    ],
    [
      'a slash in a segment',
      {ownerType: 'Organizational', ownerId: OWNER, name: 'a/b'},
      'ls',
    ],
  ])('refuses %s', (_why, boundedContext, name) => {
    expect(() => liveSystemIdOf(boundedContext, name)).toThrow(
      /Live System id/,
    );
  });
});
