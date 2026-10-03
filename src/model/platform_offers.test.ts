/**
 * platform_offers.test.ts — the remaining shared-platform offer knobs:
 *   - `AwsRdsPostgresDbms` pinned for production (provisioned, Multi-AZ, gp3, PG 17);
 *   - `AwsS3` lifecycle expiration (Loki / Tempo object storage);
 *   - the caas-k8s observability offers (kube-prometheus-stack, Loki, Tempo, Alloy).
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {Logging, Monitoring, Tracing} from './components/observability';
import {ObjectStorage, RelationalDbms} from './components/storage';
import {
  GrafanaAlloy,
  GrafanaLoki,
  GrafanaTempo,
  KubePrometheusStack,
} from './offers/observability';
import {AwsRdsPostgresDbms, AwsS3} from './offers/storage';

const environment = {};
const boundedContextId = {name: 'platform'};

describe('AwsRdsPostgresDbms pinned for production', () => {
  const dbms = (config: Parameters<typeof AwsRdsPostgresDbms>[0]) =>
    createFractal({
      id: 'platform-dbms',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({dbms: bp.add(RelationalDbms({id: 'postgres'}))}),
    })
      .toLiveSystem({name: 'platform', environment, select: {postgres: AwsRdsPostgresDbms(config)}})
      .components.find(c => c.id === 'postgres')!;

  it('carries every pin under the agent keys', () => {
    expect(
      dbms({
        mode: 'provisioned-instance',
        version: '17',
        instanceClass: 'db.t4g.medium',
        multiAz: true,
        backupRetentionDays: 14,
        deletionProtection: true,
        storageType: 'gp3',
        allocatedStorageGb: 50,
      }).parameters,
    ).toEqual({
      mode: 'provisioned-instance',
      version: '17',
      instanceClass: 'db.t4g.medium',
      multiAz: true,
      backupRetentionDays: 14,
      deletionProtection: true,
      storageType: 'gp3',
      allocatedStorageGb: 50,
    });
  });

  it('refuses a storage type RDS does not offer', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => dbms({storageType: 'gp9' as any})).toThrow(/storageType 'gp9'/);
  });
});

describe('AwsS3 lifecycle expiration', () => {
  const bucket = (config: Parameters<typeof AwsS3>[0]) =>
    createFractal({
      id: 'platform-buckets',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({loki: bp.add(ObjectStorage({id: 'loki-chunks'}))}),
    })
      .toLiveSystem({name: 'platform', environment, select: {'loki-chunks': AwsS3(config)}})
      .components.find(c => c.id === 'loki-chunks')!;

  it('carries lifecycleExpirationDays', () => {
    expect(bucket({lifecycleExpirationDays: 30}).parameters).toEqual({
      lifecycleExpirationDays: 30,
    });
  });

  it.each([[0], [1.5]])('refuses lifecycleExpirationDays %s', days => {
    expect(() => bucket({lifecycleExpirationDays: days})).toThrow(
      /lifecycleExpirationDays/,
    );
  });
});

describe('caas-k8s observability offers', () => {
  it('satisfy the neutral observability components under the caas-k8s offer ids', () => {
    const ls = createFractal({
      id: 'platform-observability',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({
        metrics: bp.add(Monitoring({id: 'metrics'})),
        logs: bp.add(Logging({id: 'logs'})),
        shipper: bp.add(Logging({id: 'shipper'})),
        traces: bp.add(Tracing({id: 'traces'})),
      }),
    }).toLiveSystem({
      name: 'platform',
      environment,
      select: {
        metrics: KubePrometheusStack({namespace: 'monitoring'}),
        logs: GrafanaLoki({namespace: 'monitoring'}),
        shipper: GrafanaAlloy({namespace: 'monitoring'}),
        traces: GrafanaTempo({namespace: 'monitoring'}),
      },
    });
    expect(
      ls.components.map(c => [c.id, c.type, c.deliveryModel, c.provider]),
    ).toEqual([
      ['metrics', 'Observability.CaaS.KubePrometheusStack', 'CaaS', undefined],
      ['logs', 'Observability.CaaS.GrafanaLoki', 'CaaS', undefined],
      ['shipper', 'Observability.CaaS.GrafanaAlloy', 'CaaS', undefined],
      ['traces', 'Observability.CaaS.GrafanaTempo', 'CaaS', undefined],
    ]);
  });
});
