/**
 * aws_rds_mysql.test.ts — executable spec for the Amazon RDS for MySQL offers and the
 * opt-in `cloudwatchLogExports` of both RDS DBMS offers:
 *   - `AwsRdsMySqlDbms` mirrors `AwsRdsPostgresDbms` key for key; only the engine
 *     (and so the agent's defaults: version 8.4, port 3306) differs;
 *   - its databases are emitted as `Storage.PaaS.AwsRdsMySqlDatabase`, whether
 *     selected as a blueprint component or added as children;
 *   - `cloudwatchLogExports` is sent only when set: unset leaves the database's
 *     exports untouched, `[]` turns them off;
 *   - `requireSecureTransport` has no default and is sent only when set: unset gives
 *     a new database the agent's TLS-requiring parameter group and leaves an
 *     existing one as it is, `true` also attaches it to an existing database,
 *     `false` never sets it up.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {RelationalDbms, RelationalDatabase} from './components/storage';
import {
  AwsRdsMySqlDbms,
  AwsRdsMySqlDatabase,
  AwsRdsPostgresDbms,
} from './offers/storage';

const environment = {};
const boundedContextId = {name: 'storage-templates'};

const fractal = () =>
  createFractal({
    id: 'mysql-stack',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const dbms = bp.add(RelationalDbms({id: 'app-dbms'}));
      const appDb = bp.add(RelationalDatabase({id: 'app-db'}).dependsOn(dbms));
      return {dbms, appDb};
    },
    operations: s => ({
      withDatabases: (names: string[]) => {
        const adds = names.map(name =>
          s.dbms.addChild(RelationalDatabase({id: name})),
        );
        return st => adds.reduce((acc, add) => add(acc), st);
      },
    }),
  });

type MySqlConfig = Parameters<typeof AwsRdsMySqlDbms>[0];
type PostgresConfig = Parameters<typeof AwsRdsPostgresDbms>[0];

const dbmsWith = (config: MySqlConfig) =>
  fractal()
    .toLiveSystem({
      name: 'cms',
      environment,
      select: {
        'app-dbms': AwsRdsMySqlDbms(config),
        'app-db': AwsRdsMySqlDatabase({}),
      },
    })
    .components.find(c => c.id === 'app-dbms')!;

describe('AwsRdsMySqlDbms and AwsRdsMySqlDatabase', () => {
  it('resolve the RelationalDbms and RelationalDatabase Components onto RDS for MySQL', () => {
    const ls = fractal().toLiveSystem({
      name: 'cms',
      environment,
      select: {
        'app-dbms': AwsRdsMySqlDbms({region: 'eu-central-1'}),
        'app-db': AwsRdsMySqlDatabase({databaseName: 'strapi'}),
      },
    });
    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));

    expect(byId['app-dbms'].type).toBe('Storage.PaaS.AwsRdsMySql');
    expect(byId['app-dbms'].provider).toBe('AWS');
    expect(byId['app-dbms'].deliveryModel).toBe('PaaS');
    expect(byId['app-db'].type).toBe('Storage.PaaS.AwsRdsMySqlDatabase');
    expect(byId['app-db'].provider).toBe('AWS');
    expect(byId['app-db'].dependencies).toContain('app-dbms');
    expect(byId['app-db'].parameters).toEqual({databaseName: 'strapi'});
  });

  it('emits child databases in the MySQL family', () => {
    const ls = fractal()
      .specialize()
      .withDatabases(['orders'])
      .toLiveSystem({
        name: 'cms',
        environment,
        select: {
          'app-dbms': AwsRdsMySqlDbms({}),
          'app-db': AwsRdsMySqlDatabase({}),
        },
      });
    const orders = ls.components.find(c => c.id === 'orders')!;

    expect(orders.type).toBe('Storage.PaaS.AwsRdsMySqlDatabase');
    expect(orders.provider).toBe('AWS');
    expect(orders.dependencies).toContain('app-dbms');
  });

  it('takes exactly the PostgreSQL offer keys, and sends what is set', () => {
    // Every key of the PostgreSQL offer, under the same name: one vocabulary for RDS.
    const config = {
      region: 'eu-central-1',
      mode: 'provisioned-instance',
      version: '8.4',
      instanceClass: 'db.t4g.micro',
      administratorLogin: 'strapiadmin',
      allocatedStorageGb: 20,
      maxAllocatedStorageGb: 100,
      minAcu: 0.5,
      maxAcu: 2,
      readerCount: 0,
      multiAz: false,
      backupRetentionDays: 7,
      deletionProtection: true,
      storageType: 'gp3',
      port: 3306,
      cloudwatchLogExports: ['error'],
      requireSecureTransport: true,
    } satisfies MySqlConfig & PostgresConfig;

    expect(dbmsWith(config).parameters).toEqual(config);
  });

  it('omits every unset knob so the agent applies its own defaults (8.4, 3306)', () => {
    const dbms = dbmsWith({});

    expect(dbms.parameters).toEqual({});
  });

  it('refuses a storage type RDS does not offer', () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dbmsWith({storageType: 'st1' as any}),
    ).toThrow(/AwsRdsMySqlDbms 'app-dbms': storageType 'st1'/);
  });

  it('refuses a master user name longer than MySQL allows (16 characters)', () => {
    expect(() => dbmsWith({administratorLogin: 'a'.repeat(17)})).toThrow(
      /AwsRdsMySqlDbms 'app-dbms': administratorLogin .* longer than 16/,
    );
    expect(() => dbmsWith({administratorLogin: 'a'.repeat(16)})).not.toThrow();
  });
});

describe('administratorLogin on AwsRdsPostgresDbms', () => {
  it('refuses a master user name longer than PostgreSQL allows (63 characters)', () => {
    const pg = (administratorLogin: string) =>
      createFractal({
        id: 'pg',
        version: {major: 1, minor: 0, patch: 0},
        boundedContextId,
        blueprint: bp => ({dbms: bp.add(RelationalDbms({id: 'pg'}))}),
      }).toLiveSystem({
        name: 'pg',
        environment,
        select: {pg: AwsRdsPostgresDbms({administratorLogin})},
      });
    expect(() => pg('a'.repeat(64))).toThrow(
      /AwsRdsPostgresDbms 'pg': administratorLogin .* longer than 63/,
    );
    expect(() => pg('a'.repeat(63))).not.toThrow();
  });
});

describe('cloudwatchLogExports on both RDS DBMS offers (opt-in)', () => {
  const postgresWith = (config: PostgresConfig) =>
    createFractal({
      id: 'pg',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({dbms: bp.add(RelationalDbms({id: 'pg'}))}),
    })
      .toLiveSystem({
        name: 'pg',
        environment,
        select: {pg: AwsRdsPostgresDbms(config)},
      })
      .components.find(c => c.id === 'pg')!;

  it.each([
    ['PostgreSQL', () => postgresWith({}).parameters],
    ['MySQL', () => dbmsWith({}).parameters],
  ])('%s: unset sends no key at all (never [])', (_engine, parameters) => {
    expect(Object.keys(parameters())).not.toContain('cloudwatchLogExports');
  });

  it.each([
    [
      'PostgreSQL',
      () => postgresWith({cloudwatchLogExports: ['postgresql']}).parameters,
      ['postgresql'],
    ],
    [
      'MySQL',
      () => dbmsWith({cloudwatchLogExports: ['error', 'slowquery']}).parameters,
      ['error', 'slowquery'],
    ],
  ])('%s: set sends the log types as given', (_engine, parameters, sent) => {
    expect(parameters().cloudwatchLogExports).toEqual(sent);
  });

  it('an explicit [] is sent, so exports can be turned off', () => {
    expect(dbmsWith({cloudwatchLogExports: []}).parameters).toEqual({
      cloudwatchLogExports: [],
    });
    expect(postgresWith({cloudwatchLogExports: []}).parameters).toEqual({
      cloudwatchLogExports: [],
    });
  });

  it.each([
    ['a log type that is not a string', [42], /cloudwatchLogExports/],
    ['a blank log type', [' '], /cloudwatchLogExports/],
    ['a log type listed twice', ['error', 'error'], /cloudwatchLogExports/],
    [
      'a log type listed twice in another case or with spaces',
      ['error', ' ERROR'],
      /cloudwatchLogExports/,
    ],
  ])('refuses %s', (_why, types, reason) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exports = types as any;
    expect(() => dbmsWith({cloudwatchLogExports: exports})).toThrow(reason);
    expect(() => postgresWith({cloudwatchLogExports: exports})).toThrow(reason);
  });
});

describe('requireSecureTransport on both RDS DBMS offers (no default)', () => {
  const postgresWith = (config: PostgresConfig) =>
    createFractal({
      id: 'pg',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({dbms: bp.add(RelationalDbms({id: 'pg'}))}),
    })
      .toLiveSystem({
        name: 'pg',
        environment,
        select: {pg: AwsRdsPostgresDbms(config)},
      })
      .components.find(c => c.id === 'pg')!;

  it.each([
    ['PostgreSQL', () => postgresWith({}).parameters],
    ['MySQL', () => dbmsWith({}).parameters],
  ])('%s: unset sends no key at all (never true, never false)', (_engine, parameters) => {
    expect(Object.keys(parameters())).not.toContain('requireSecureTransport');
  });

  it.each([true, false])('sends %s as given, on both engines', value => {
    expect(postgresWith({requireSecureTransport: value}).parameters).toEqual({
      requireSecureTransport: value,
    });
    expect(dbmsWith({requireSecureTransport: value}).parameters).toEqual({
      requireSecureTransport: value,
    });
  });

  it.each([
    ['the string "true"', 'true'],
    ['the string "false"', 'false'],
    ['a number', 1],
    ['null', null],
  ])('refuses %s', (_why, value) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requireSecureTransport = value as any;
    expect(() => dbmsWith({requireSecureTransport})).toThrow(
      /AwsRdsMySqlDbms 'app-dbms': requireSecureTransport must be true or false/,
    );
    expect(() => postgresWith({requireSecureTransport})).toThrow(
      /AwsRdsPostgresDbms 'pg': requireSecureTransport must be true or false/,
    );
  });
});
