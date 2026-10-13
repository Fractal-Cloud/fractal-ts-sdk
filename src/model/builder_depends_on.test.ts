/**
 * builder_depends_on.test.ts — every component a self-hosted or placed offer
 * may need to put somewhere can declare that dependency.
 *
 * A gateway, certificate issuer, broker or monitoring stack installed on a
 * Kubernetes cluster is placed by its dependency on that cluster, and an RDS
 * DBMS by its dependencies on subnets. These builders had no `dependsOn`, so
 * the dependency could not be declared from TypeScript.
 */
import {describe, it, expect} from 'vitest';
import {createFractal, type AnyNode} from './core';
import {ApiGateway} from './components/api_management';
import {CertificateManager} from './components/certificate_manager';
import {Broker} from './components/messaging';
import {Logging, Monitoring, Tracing} from './components/observability';
import {IdentityProvider, ServiceMesh} from './components/security';
import {ObjectStorage, RelationalDbms} from './components/storage';
import {ContainerPlatform} from './components/network_and_compute';

const builders: Array<[string, (other: AnyNode) => AnyNode]> = [
  ['ApiGateway', c => ApiGateway({id: 'subject'}).dependsOn(c)],
  ['CertificateManager', c => CertificateManager({id: 'subject'}).dependsOn(c)],
  ['ServiceMesh', c => ServiceMesh({id: 'subject'}).dependsOn(c)],
  ['IdentityProvider', c => IdentityProvider({id: 'subject'}).dependsOn(c)],
  ['ObjectStorage', c => ObjectStorage({id: 'subject'}).dependsOn(c)],
  ['RelationalDbms', c => RelationalDbms({id: 'subject'}).dependsOn(c)],
  ['Broker', c => Broker({id: 'subject'}).dependsOn(c)],
  ['Monitoring', c => Monitoring({id: 'subject'}).dependsOn(c)],
  ['Tracing', c => Tracing({id: 'subject'}).dependsOn(c)],
  ['Logging', c => Logging({id: 'subject'}).dependsOn(c)],
];

describe('dependsOn on every builder', () => {
  it.each(builders)(
    '%s carries the dependency into the blueprint',
    (_, withDependency) => {
      const fractal = createFractal({
        id: 'depends-on',
        version: {major: 1, minor: 0, patch: 0},
        boundedContextId: {name: 'builders'},
        blueprint: bp => {
          const cluster = bp.add(ContainerPlatform({id: 'cluster'}));
          return {cluster, subject: bp.add(withDependency(cluster))};
        },
      });
      const subject = fractal.blueprint.components.find(
        c => c.id === 'subject',
      )!;
      expect(subject.dependencies).toEqual(['cluster']);
    },
  );

  it('leaves the original node unchanged and keeps guardrails', () => {
    const cluster = ContainerPlatform({id: 'cluster'});
    const gateway = ApiGateway({id: 'gw'}).withHttpsOnly(true);
    const placed = gateway.dependsOn(cluster);
    expect(gateway.state.dependencies).toEqual([]);
    expect(placed.state.dependencies).toEqual(['cluster']);
    expect(placed.state.parameters).toEqual({httpsOnly: true});
    expect([...placed.state.locked]).toEqual(['httpsOnly']);
  });

  it('chains with the other setters', () => {
    const cluster = ContainerPlatform({id: 'cluster'});
    const dbms = RelationalDbms({id: 'dbms'})
      .dependsOn(cluster)
      .withStorageGb(20);
    expect(dbms.state.dependencies).toEqual(['cluster']);
    expect(dbms.state.parameters).toEqual({storageGb: 20});
  });
});
