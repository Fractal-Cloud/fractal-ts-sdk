/**
 * offer_contract_splits.test.ts — two agent contracts the 2.15.0 re-pin
 * reshaped, and the SDK offers that must not lose anything over it.
 *
 * - fractal-cloud-agents v8.31.0 (gcp): `NetworkAndCompute.PaaS.CloudRun` is
 *   the Cloud Run platform. It declares `region` only, and the agent creates
 *   nothing for it (platform-only, since v8.28.0). The workload keys are
 *   declared on `NetworkAndCompute.CaaS.CloudRunService` alone. The SDK
 *   `CloudRun` offer emits `CloudRunService`, so every key it sent with 2.14.0
 *   still reaches the agent that reads it.
 * - aria-agent-caas-k8s v1.17.0: MinIO is published as two offers.
 *   `Storage.CaaS.MinioTenant` serves `Storage.CaaS.MinIO`, and
 *   `BigData.CaaS.MinioTenant` serves `BigData.CaaS.MinIO`. The SDK `MinIO`
 *   offer still emits `Storage.CaaS.MinioTenant` with the keys of 2.14.0.
 *
 * The facts about the contracts are read from the committed snapshot, which
 * `readSnapshot` refuses unless it matches the digest and tag pinned in
 * contracts/sources.json. The tag and digest are spelled out below: a re-pin
 * fails here until these facts are checked against the new contract.
 */
import {describe, expect, it} from 'vitest';
import {
  readSnapshot,
  readSources,
} from '../../scripts/offer-contracts/snapshot.mjs';
import {CloudRun} from './offers/custom_workloads';
import {MinIO} from './offers/storage';
import type {LiveSystemComponent, Offer} from './core';

type SnapshotOffer = {
  readonly offerType: string;
  readonly aliasOfOfferType: string | null;
  readonly serviceTypes?: readonly string[];
  readonly params: ReadonlyArray<{readonly key: string}>;
};
type Snapshot = {
  readonly agentId: string;
  readonly agentVersion: string;
  readonly offers: readonly SnapshotOffer[];
};
type Source = {
  readonly agentId: string;
  readonly repository: string;
  readonly tag: string;
  readonly fetch: {readonly kind: string; readonly asset: string};
  readonly snapshotSha256: string;
};

const SNAPSHOTS = readSnapshot('.') as readonly Snapshot[];
const SOURCES = (readSources('.') as {agents: readonly Source[]}).agents;

const source = (agentId: string) => SOURCES.find(s => s.agentId === agentId)!;

const snapshotOffer = (agentId: string, offerType: string): SnapshotOffer => {
  const snapshot = SNAPSHOTS.find(s => s.agentId === agentId)!;
  const offer = snapshot.offers.find(o => o.offerType === offerType);
  expect(offer, `${agentId} declares ${offerType}`).toBeDefined();
  return offer!;
};

const paramKeys = (offer: SnapshotOffer) => offer.params.map(p => p.key).sort();

const instantiate = (
  offer: Offer,
  parameters: Record<string, unknown> = {},
): LiveSystemComponent[] =>
  offer.instantiate({
    id: 'probe',
    displayName: 'probe',
    parameters,
    locked: [],
    dependencies: [],
    links: [],
    children: [],
  });

describe('GCP Cloud Run: platform and service (fractal-cloud-agents v8.31.0)', () => {
  const GCP = 'fractal-cloud-agent-gcp';

  // Every key the CloudRunService contract declared when 2.14.0 was cut
  // (fractal-cloud-agents v8.25.11). Spelled out so a key that leaves the
  // contract or the offer fails here.
  const KEYS_2_14_0 = [
    'concurrency',
    'cpu',
    'environment',
    'image',
    'ingress',
    'maxInstances',
    'memory',
    'minInstances',
    'port',
    'region',
    'serviceAccountEmail',
  ];

  it('is read from the gcp contract published with v8.31.0', () => {
    expect(source(GCP)).toEqual({
      agentId: GCP,
      repository: 'Fractal-Cloud/fractal-cloud-agents',
      tag: 'v8.31.0',
      fetch: {kind: 'release-asset', asset: 'param-contract.gcp.json'},
      snapshotSha256:
        'a6519548de11b2a6e02b04844a87c7ad623f15c095e4f76c750a7470c804f98b',
    });
  });

  it('declares only region on the platform type, which the agent deploys nothing for', () => {
    // The agent treats NetworkAndCompute.PaaS.CloudRun as the platform only:
    // it reads `region` and creates no resource. No other type is an alias
    // of it, so a workload is never routed to it.
    const platform = snapshotOffer(GCP, 'NetworkAndCompute.PaaS.CloudRun');
    expect(paramKeys(platform)).toEqual(['region']);
    const snapshot = SNAPSHOTS.find(s => s.agentId === GCP)!;
    expect(
      snapshot.offers
        .filter(o => o.aliasOfOfferType === 'NetworkAndCompute.PaaS.CloudRun')
        .map(o => o.offerType),
    ).toEqual([]);
  });

  it('declares every workload key of 2.14.0 on CloudRunService', () => {
    const service = snapshotOffer(
      GCP,
      'NetworkAndCompute.CaaS.CloudRunService',
    );
    expect(service.aliasOfOfferType).toBeNull();
    expect(paramKeys(service)).toEqual(
      [...KEYS_2_14_0, 'environmentSecretShortNames'].sort(),
    );
  });

  it('CloudRun emits CloudRunService and sends every key it sent with 2.14.0', () => {
    const config = {
      concurrency: 80,
      cpu: '1',
      environment: {LOG_LEVEL: 'info'},
      ingress: 'internal',
      maxInstances: 3,
      memory: '512Mi',
      minInstances: 1,
      region: 'europe-west1',
      serviceAccountEmail: 'web@acme-prod.iam.gserviceaccount.com',
    };
    const components = instantiate(CloudRun(config), {
      image: 'registry/web:1',
      port: 8080,
    });
    expect(components).toHaveLength(1);
    const [c] = components;
    expect(c.type).toBe('NetworkAndCompute.CaaS.CloudRunService');
    expect(c.type).not.toBe('NetworkAndCompute.PaaS.CloudRun');
    expect(c.parameters).toEqual({
      ...config,
      image: 'registry/web:1',
      port: 8080,
    });
    expect(Object.keys(c.parameters).sort()).toEqual(KEYS_2_14_0);
  });
});

describe('caas-k8s MinIO: one offer per service type (aria-agent-caas-k8s v1.17.0)', () => {
  const CAAS = 'aria-agent-caas-k8s';

  // The keys Storage.CaaS.MinioTenant declared when 2.14.0 was cut
  // (aria-agent-caas-k8s v1.8.1, where it served both service types).
  const KEYS_2_14_0 = [
    'bucketName',
    'namespace',
    'requestAutoCert',
    'servers',
    'storageClass',
    'tenantName',
    'volumeSize',
    'volumesPerServer',
  ];

  it('is read from the caas-k8s contract published with v1.17.0', () => {
    expect(source(CAAS)).toEqual({
      agentId: CAAS,
      repository: 'Fractal-Cloud/aria-agent-caas-k8s',
      tag: 'v1.17.0',
      fetch: {kind: 'release-asset', asset: 'param-contract.json'},
      snapshotSha256:
        '4f7147f24467ac6eb1aea80724a928a14d45d5da3388a5581810e40b7f9e0cee',
    });
  });

  it('serves each MinIO service type from its own offer, with the same keys', () => {
    // The agent dispatches by offer type; both offers are served by the same
    // tenant handler, so a deployed Storage.CaaS.MinioTenant reconciles as
    // before. Service types place an offer in the catalog; the SDK reads none.
    const storage = snapshotOffer(CAAS, 'Storage.CaaS.MinioTenant');
    const bigData = snapshotOffer(CAAS, 'BigData.CaaS.MinioTenant');
    expect(storage.serviceTypes).toEqual(['Storage.CaaS.MinIO']);
    expect(bigData.serviceTypes).toEqual(['BigData.CaaS.MinIO']);
    expect(storage.aliasOfOfferType).toBeNull();
    expect(bigData.aliasOfOfferType).toBeNull();
    expect(paramKeys(storage)).toEqual(KEYS_2_14_0);
    expect(paramKeys(bigData)).toEqual(KEYS_2_14_0);
  });

  it('MinIO emits Storage.CaaS.MinioTenant and sends every key it sent with 2.14.0', () => {
    const config = {
      bucketName: 'uploads',
      namespace: 'team-a',
      requestAutoCert: true,
      servers: 4,
      storageClass: 'gp3',
      tenantName: 'uploads',
      volumeSize: '20Gi',
      volumesPerServer: 2,
    };
    const components = instantiate(MinIO(config));
    expect(components).toHaveLength(1);
    const [c] = components;
    expect(c.type).toBe('Storage.CaaS.MinioTenant');
    expect(c.parameters).toEqual(config);
    expect(Object.keys(c.parameters).sort()).toEqual(KEYS_2_14_0);
  });
});
