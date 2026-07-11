/**
 * storage.test.ts — executable spec for the Storage domain on the LOCKED engine.
 *
 * Proves the Storage Component factories + Offer catalogue compose with core:
 *   - guardrails are recorded + locked on the blueprint;
 *   - per-component offer selection builds a mixed-vendor LiveSystem;
 *   - RelationalDatabase.dependsOn(dbms) wiring survives into the live system;
 *   - selecting an offer that does not satisfy a Component is a type error AND throws.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {
  ObjectStorage,
  RelationalDbms,
  RelationalDatabase,
} from './components/storage';
import {
  AwsS3,
  AzurePostgresDbms,
  AzurePostgresDatabase,
} from './offers/storage';

const environment = {};
const boundedContextId = {id: 'storage-templates'};

function authorFractal() {
  return createFractal({
    id: 'storage-stack',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const uploads = bp.add(
        ObjectStorage({id: 'uploads'})
          .withEncryption('at-rest')
          .withVersioningEnabled(true)
          .withPublicAccess(false)
          .withRetentionDays(90)
          .withTags({team: 'platform'}),
      );
      const dbms = bp.add(
        RelationalDbms({id: 'app-dbms'})
          .withEngineVersion('16')
          .withBackupRetentionDays(30)
          .withStorageGb(100)
          .withHighAvailability('zone-redundant'),
      );
      const appDb = bp.add(RelationalDatabase({id: 'app-db'}).dependsOn(dbms));
      return {uploads, dbms, appDb};
    },
    operations: s => ({
      // dev-open param: collation is NOT a guardrail, so devs may set it.
      withCollation: (v: string) => s.appDb.set('collation', v),
    }),
  });
}

const fullSelect = () => ({
  uploads: AwsS3({bucketRegion: 'us-east-1'}),
  'app-dbms': AzurePostgresDbms({resourceGroup: 'rg'}),
  'app-db': AzurePostgresDatabase({}),
});

describe('Storage domain on the locked Fractal model', () => {
  it('blueprint lists the three abstract Storage Components in order', () => {
    expect(authorFractal().blueprint.components.map(c => c.component)).toEqual([
      'Storage.ObjectStorage',
      'Storage.RelationalDbms',
      'Storage.RelationalDatabase',
    ]);
  });

  it('guardrails are recorded and locked', () => {
    const uploads = authorFractal().blueprint.components.find(
      c => c.id === 'uploads',
    )!;
    expect(uploads.parameters.encryption).toBe('at-rest');
    expect(uploads.parameters.versioningEnabled).toBe(true);
    expect(uploads.parameters.tags).toEqual({team: 'platform'});
    expect(uploads.locked).toContain('encryption');

    const dbms = authorFractal().blueprint.components.find(
      c => c.id === 'app-dbms',
    )!;
    expect(dbms.parameters.backupRetentionDays).toBe(30);
    expect(dbms.locked).toContain('backupRetentionDays');
  });

  it('builds a mixed-vendor LiveSystem by per-component offer selection', () => {
    const ls = authorFractal()
      .specialize()
      .withCollation('en_US.utf8')
      .toLiveSystem({name: 'acme-prod', environment, select: fullSelect()});

    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));

    // ObjectStorage resolved to AWS S3.
    expect(byId['uploads'].type).toBe('Storage.PaaS.S3');
    expect(byId['uploads'].provider).toBe('AWS');
    // guardrail + vendor config both flowed into the live component.
    expect(byId['uploads'].parameters.encryption).toBe('at-rest');
    expect(byId['uploads'].parameters.bucketRegion).toBe('us-east-1');

    // Mixed vendor: Postgres on Azure alongside S3 on AWS.
    expect(byId['app-dbms'].type).toBe('Storage.PaaS.AzurePostgresDbms');
    expect(byId['app-dbms'].provider).toBe('Azure');
    expect(byId['app-dbms'].parameters.backupRetentionDays).toBe(30);

    // dev-open param flowed; dependency wiring survived.
    expect(byId['app-db'].parameters.collation).toBe('en_US.utf8');
    expect(byId['app-db'].dependencies).toContain('app-dbms');
  });

  it('displayName defaults to the component id when not set, and is honored when set', () => {
    // Unset → defaults to id, on both blueprint and live components (control
    // plane requires a non-null displayName on every LiveSystemComponent).
    const bp = authorFractal().blueprint.components.find(
      c => c.id === 'uploads',
    )!;
    expect(bp.displayName).toBe('uploads');

    const ls = authorFractal().toLiveSystem({
      name: 'acme-prod',
      environment,
      select: fullSelect(),
    });
    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));
    expect(byId['uploads'].displayName).toBe('uploads');
    expect(byId['app-dbms'].displayName).toBe('app-dbms');
    expect(byId['app-db'].displayName).toBe('app-db');

    // Explicit displayName (factory cfg) flows through to the live component,
    // including DBMS children emitted in the parent's vendor family.
    const named = createFractal({
      id: 'named-stack',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp2 => {
        const dbms = bp2.add(
          RelationalDbms({
            id: 'app-dbms',
            displayName: 'Application DB Engine',
          }),
        );
        return {dbms};
      },
      operations: s => ({
        withDatabases: (names: string[]) => {
          const adds = names.map(name =>
            s.dbms.addChild(RelationalDatabase({id: name, displayName: name})),
          );
          return st => adds.reduce((acc, add) => add(acc), st);
        },
      }),
    });
    const namedLs = named
      .specialize()
      .withDatabases(['orders'])
      .toLiveSystem({
        name: 'named-prod',
        environment,
        select: {'app-dbms': AzurePostgresDbms({resourceGroup: 'rg'})},
      });
    const namedById = Object.fromEntries(
      namedLs.components.map(c => [c.id, c]),
    );
    expect(namedById['app-dbms'].displayName).toBe('Application DB Engine');
    expect(namedById['orders'].displayName).toBe('orders');
  });

  it('selecting an offer that does not satisfy the Component is a type error AND throws', () => {
    expect(() =>
      authorFractal().toLiveSystem({
        name: 'x',
        environment,
        select: {
          ...fullSelect(),
          // @ts-expect-error AzurePostgresDatabase (Storage.RelationalDatabase) cannot satisfy Storage.ObjectStorage
          uploads: AzurePostgresDatabase({}),
        },
      }),
    ).toThrow(/does not satisfy/);
  });
});
