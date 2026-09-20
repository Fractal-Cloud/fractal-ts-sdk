/**
 * children.test.ts — model option B: application operations that ADD components.
 *
 * The app declares its databases by name (withDatabases); each is a first-class
 * RelationalDatabase component added under the DBMS. Databases are emitted by the
 * chosen DBMS offer in ITS OWN vendor family — no separate selection. Swapping
 * the DBMS offer swaps the database family too. Each database depends on its DBMS.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {RelationalDbms, RelationalDatabase} from './components/storage';
import {
  AzurePostgresDbms,
  GcpMySqlDbms,
  GcpPostgresDbms,
} from './offers/storage';

const environment = {name: 'dev'};
const boundedContextId = {name: 'reusable-templates'};

function authorFractal() {
  return createFractal({
    id: 'db',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => ({
      dbms: bp.add(RelationalDbms({id: 'app-dbms'}).withEngineVersion('16')),
    }),
    operations: s => ({
      // application-level: the app owns these databases (by name); charset is an
      // architect-governed default applied to each.
      withDatabases: (names: string[]) => {
        const adds = names.map(name =>
          s.dbms.addChild(RelationalDatabase({id: name}).withCharset('UTF8')),
        );
        return st => adds.reduce((acc, add) => add(acc), st);
      },
    }),
  });
}

describe('option B — operations add first-class child components (family follows)', () => {
  it('the DBMS offer emits a Database component per app-declared database', () => {
    const ls = authorFractal()
      .specialize()
      .withDatabases(['orders', 'audit'])
      .toLiveSystem({
        name: 'acme',
        environment,
        select: {'app-dbms': AzurePostgresDbms({resourceGroup: 'rg'})},
      });

    expect(ls.components.map(c => c.id)).toEqual([
      'app-dbms',
      'orders',
      'audit',
    ]);

    const dbms = ls.components.find(c => c.id === 'app-dbms')!;
    expect(dbms.type).toBe('Storage.PaaS.AzurePostgresDbms');

    const orders = ls.components.find(c => c.id === 'orders')!;
    expect(orders.type).toBe('Storage.PaaS.AzurePostgresDatabase'); // companion family
    expect(orders.provider).toBe('Azure');
    expect(orders.dependencies).toContain('app-dbms'); // child depends on its DBMS
    expect(orders.parameters.charset).toBe('UTF8'); // governed default flowed
  });

  it('swapping the DBMS offer swaps the database family (GCP)', () => {
    const ls = authorFractal()
      .specialize()
      .withDatabases(['orders'])
      .toLiveSystem({
        name: 'acme',
        environment,
        select: {'app-dbms': GcpPostgresDbms({tier: 'db-custom-2-7680'})},
      });
    const orders = ls.components.find(c => c.id === 'orders')!;
    expect(orders.type).toBe('Storage.PaaS.GcpPostgresDatabase');
    expect(orders.provider).toBe('GCP');
  });

  /**
   * GCP MySQL ships the DBMS tier only, so it has no Database offer to emit
   * children as and omits `instantiate`. The plan for this Offer assumed that
   * meant children were dropped SILENTLY, and chose the option on the grounds
   * that a documented quiet failure beats an undocumented one. It is not quiet:
   * `toLiveSystem`'s child-drop guard throws, naming the offer and every dropped
   * child, before anything reaches a cloud. The decision is unchanged and better
   * founded than it was argued — this pins the behaviour it actually rests on.
   */
  it('GCP MySQL refuses a DBMS that has declared databases, naming them', () => {
    const build = () =>
      authorFractal()
        .specialize()
        .withDatabases(['orders'])
        .toLiveSystem({
          name: 'acme',
          environment,
          select: {
            'app-dbms': GcpMySqlDbms({
              network: 'acme-vpc',
              instanceTier: 'db-perf-optimized-N-4',
            }),
          },
        });

    expect(build).toThrow(/Storage\.PaaS\.GcpMySqlDbms/);
    expect(build).toThrow(/orders/);
  });

  it('GCP MySQL emits the DBMS itself, with the keys the agent reads', () => {
    const ls = authorFractal()
      .specialize()
      .toLiveSystem({
        name: 'acme',
        environment,
        select: {
          'app-dbms': GcpMySqlDbms({
            network: 'acme-vpc',
            instanceTier: 'db-perf-optimized-N-4',
          }),
        },
      });

    expect(ls.components.map(c => c.id)).toEqual(['app-dbms']);

    const dbms = ls.components.find(c => c.id === 'app-dbms')!;
    expect(dbms.type).toBe('Storage.PaaS.GcpMySqlDbms');
    expect(dbms.provider).toBe('GCP');
    // Spelled as the agent reads it. `tier` is pruned before the agent sees it.
    expect(dbms.parameters.instanceTier).toBe('db-perf-optimized-N-4');
    // The one parameter the agent refuses to default, and the reason `network`
    // is required on this offer's config where the PostgreSQL one omits it.
    expect(dbms.parameters.network).toBe('acme-vpc');
  });
});
