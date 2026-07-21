/**
 * operation_links.test.ts — proves links can be authored in the Fractal
 * Interface `operations` (not only in the blueprint via bp.link).
 *
 * Shape mirrors the app-with-identity sample: the blueprint owns the "where"
 * (a ContainerPlatform), the database engine (a RelationalDbms) and an
 * IdentityProvider. The consuming dev adds a stateful service via an operation
 * that, in one transform, (a) adds a Workload child under the platform, (b) adds
 * a RelationalDatabase child under the DBMS, and (c) links the workload to both
 * the database and the identity provider. Link authoring stays a Fractal-level
 * concern — only the architect-authored operation creates them.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {ContainerPlatform} from './components/network_and_compute';
import {RelationalDbms, RelationalDatabase} from './components/storage';
import {IdentityProvider} from './components/security';
import {Workload} from './components/custom_workloads';
import {Aks, Eks} from './offers/network_and_compute';
import {AzurePostgresDbms} from './offers/storage';
import {EntraExternalId} from './offers/security';

const environment = {name: 'dev'};
const boundedContextId = {name: 'reusable-templates'};

function authorFractal() {
  return createFractal({
    id: 'app-with-identity',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const platform = bp.add(
        ContainerPlatform({id: 'app-platform'}).withKubernetesVersion('1.29'),
      );
      const dbms = bp.add(
        RelationalDbms({id: 'app-dbms'}).withEngineVersion('16'),
      );
      const idp = bp.add(
        IdentityProvider({id: 'idp'}).withMfaConfiguration('ON'),
      );
      return {platform, dbms, idp};
    },
    operations: (s, {link}) => ({
      withStatefulService: (opts: {name: string; image: string}) => {
        const db = RelationalDatabase({id: `${opts.name}-db`}).withCharset(
          'UTF8',
        );
        const workload = Workload({id: opts.name})
          .withImage(opts.image)
          .withMaxReplicas(5);
        const transforms = [
          s.dbms.addChild(db),
          s.platform.addChild(workload),
          link(workload, db, {access: 'read-write'}),
          link(workload, s.idp, {
            clientType: 'web',
            redirectUris: ['https://app.example/cb'],
          }),
        ];
        return st => transforms.reduce((acc, t) => t(acc), st);
      },
    }),
  });
}

describe('links authored in Fractal Interface operations', () => {
  it('the workload child carries the operation-authored links (wire contract)', () => {
    const ls = authorFractal()
      .specialize()
      .withStatefulService({name: 'orders', image: 'acme/web:1.4.0'})
      .toLiveSystem({
        name: 'acme',
        environment,
        select: {
          'app-platform': Aks({}),
          'app-dbms': AzurePostgresDbms({resourceGroup: 'rg'}),
          idp: EntraExternalId({tenantName: 't', resourceGroup: 'rg'}),
        },
      });

    // ContainerPlatform emits the workload child as a portable K8s workload.
    const workload = ls.components.find(c => c.id === 'orders')!;
    expect(workload.type).toBe('CustomWorkloads.CaaS.K8sWorkload');
    expect(workload.dependencies).toContain('app-platform'); // auto-wired child dep
    expect(workload.parameters.image).toBe('acme/web:1.4.0');
    expect(workload.parameters.maxReplicas).toBe(5);

    // Both operation-authored links flow onto the workload.
    expect(workload.links).toContainEqual({
      componentId: 'orders-db',
      settings: {access: 'read-write'},
    });
    expect(workload.links).toContainEqual({
      componentId: 'idp',
      settings: {
        clientType: 'web',
        redirectUris: ['https://app.example/cb'],
      },
    });

    // The database child is emitted by the DBMS offer in its own family.
    const db = ls.components.find(c => c.id === 'orders-db')!;
    expect(db.type).toBe('Storage.PaaS.AzurePostgresDatabase');
    expect(db.dependencies).toContain('app-dbms');
  });

  it('swapping the platform offer keeps the workload portable (EKS)', () => {
    const ls = authorFractal()
      .specialize()
      .withStatefulService({name: 'orders', image: 'acme/web:1.4.0'})
      .toLiveSystem({
        name: 'acme',
        environment,
        select: {
          'app-platform': Eks({}),
          'app-dbms': AzurePostgresDbms({resourceGroup: 'rg'}),
          idp: EntraExternalId({tenantName: 't', resourceGroup: 'rg'}),
        },
      });
    const platform = ls.components.find(c => c.id === 'app-platform')!;
    expect(platform.type).toBe('NetworkAndCompute.PaaS.AwsEks');
    const workload = ls.components.find(c => c.id === 'orders')!;
    expect(workload.type).toBe('CustomWorkloads.CaaS.K8sWorkload');
    expect(workload.links).toContainEqual({
      componentId: 'orders-db',
      settings: {access: 'read-write'},
    });
  });
});
