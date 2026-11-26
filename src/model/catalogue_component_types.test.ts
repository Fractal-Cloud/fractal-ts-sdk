import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {
  CATALOGUE_COMPONENTS,
  DELIVERY_MODEL_EXEMPT_OFFERS,
  catalogueComponentType,
  deliveryModelsOf,
  effectiveDeliveryModel,
} from './catalogue_component_types';
import {createFractal} from './core';
import type {DeliveryModel} from './core';
import {ComputeCluster, DataProcessingJob} from './components/big_data';
import {Workload} from './components/custom_workloads';
import {AzureContainerApp} from './offers/custom_workloads';
import {ContainerPlatform} from './components/network_and_compute';
import {AzureContainerAppsEnvironment} from './offers/network_and_compute';
import {
  AwsDatabricksCluster,
  AwsDatabricksJob,
  CaaSSparkCluster,
} from './offers/big_data';
import * as model from './index';

const COMPONENTS_DIR = join(__dirname, 'components');

/**
 * The Level-1 components the catalogue (WebBFF blueprintComponents/*.ts)
 * declares. A snapshot, so the table is checked against the catalogue's own
 * spelling and a rename there is a deliberate edit here.
 */
const CATALOGUE_TYPES: ReadonlySet<string> = new Set([
  'APIManagement.CaaS.APIGateway',
  'APIManagement.PaaS.APIGateway',
  'BigData.CaaS.ComputeCluster',
  'BigData.CaaS.Datalake',
  'BigData.CaaS.DataProcessingJob',
  'BigData.CaaS.DistributedDataProcessing',
  'BigData.CaaS.MlExperiment',
  'BigData.PaaS.ComputeCluster',
  'BigData.PaaS.Datalake',
  'BigData.PaaS.DataProcessingJob',
  'BigData.PaaS.DistributedDataProcessing',
  'BigData.PaaS.MlExperiment',
  'CustomWorkloads.CaaS.Workload',
  'CustomWorkloads.FaaS.Workload',
  'CustomWorkloads.IaaS.Workload',
  'CustomWorkloads.PaaS.Workload',
  'Messaging.CaaS.Broker',
  'Messaging.CaaS.Entity',
  'Messaging.EmailSender',
  'Messaging.PaaS.Broker',
  'Messaging.PaaS.Entity',
  'NetworkAndCompute.IaaS.LoadBalancer',
  'NetworkAndCompute.IaaS.SecurityGroup',
  'NetworkAndCompute.IaaS.Subnet',
  'NetworkAndCompute.IaaS.VirtualMachine',
  'NetworkAndCompute.IaaS.VirtualNetwork',
  'NetworkAndCompute.PaaS.ContainerPlatform',
  'NetworkAndCompute.PaaS.DnsZone',
  'Observability.CaaS.Logging',
  'Observability.CaaS.LogShipper',
  'Observability.CaaS.Monitoring',
  'Observability.CaaS.Tracing',
  'Security.CaaS.ServiceMeshSecurity',
  'Security.PaaS.IdentityProvider',
  'Storage.CaaS.ObjectStorage',
  'Storage.CaaS.RelationalDatabase',
  'Storage.CaaS.RelationalDbms',
  'Storage.CaaS.Search',
  'Storage.PaaS.FilesAndBlobs',
  'Storage.PaaS.RelationalDatabase',
  'Storage.PaaS.RelationalDbms',
]);

/** Every abstract tag a component factory passes to `newNode`, and how many
 *  `newNode(` call sites there are, so a call the scan cannot read is noticed. */
const scanComponents = (): {tags: string[]; callSites: number} => {
  const tags = new Set<string>();
  let callSites = 0;
  for (const file of readdirSync(COMPONENTS_DIR)) {
    if (!file.endsWith('.ts') || file.includes('.test')) {
      continue;
    }
    const source = readFileSync(join(COMPONENTS_DIR, file), 'utf8');
    callSites += [...source.matchAll(/\bnewNode\(/g)].length;
    for (const m of source.matchAll(/newNode\(\s*[^,]+,\s*'([A-Za-z.]+)'/g)) {
      tags.add(m[1]);
    }
  }
  return {tags: [...tags], callSites};
};

describe('catalogueComponentType', () => {
  it('uses the default delivery model when none is stated', () => {
    expect(catalogueComponentType('BigData.DistributedDataProcessing')).toBe(
      'BigData.PaaS.DistributedDataProcessing',
    );
    expect(catalogueComponentType('CustomWorkloads.Workload')).toBe(
      'CustomWorkloads.CaaS.Workload',
    );
  });

  it('follows the stated delivery model', () => {
    expect(catalogueComponentType('BigData.ComputeCluster', 'CaaS')).toBe(
      'BigData.CaaS.ComputeCluster',
    );
    expect(catalogueComponentType('CustomWorkloads.Workload', 'PaaS')).toBe(
      'CustomWorkloads.PaaS.Workload',
    );
  });

  it('uses the catalogue spelling where it differs from the SDK', () => {
    expect(catalogueComponentType('Storage.ObjectStorage')).toBe(
      'Storage.PaaS.FilesAndBlobs',
    );
    expect(catalogueComponentType('Storage.ObjectStorage', 'CaaS')).toBe(
      'Storage.CaaS.ObjectStorage',
    );
    expect(catalogueComponentType('APIManagement.ApiGateway')).toBe(
      'APIManagement.PaaS.APIGateway',
    );
  });

  it('refuses a delivery model the component has no catalogue component for', () => {
    expect(() =>
      catalogueComponentType('NetworkAndCompute.Subnet', 'CaaS'),
    ).toThrow(/no CaaS delivery model.*IaaS/);
  });

  it('leaves an unmapped tag unchanged and enforces no model on it', () => {
    expect(catalogueComponentType('Unmanaged')).toBe('Unmanaged');
    expect(catalogueComponentType('Vendor.Custom', 'CaaS')).toBe(
      'Vendor.Custom',
    );
    expect(effectiveDeliveryModel('Unmanaged')).toBeUndefined();
  });
});

describe('the table against the catalogue', () => {
  it('maps every abstract component the SDK can author, except Unmanaged', () => {
    const {tags, callSites} = scanComponents();
    const unmapped = tags.filter(
      t => t !== 'Unmanaged' && !(t in CATALOGUE_COMPONENTS),
    );
    expect(unmapped).toEqual([]);
    // Every newNode call names its tag as a literal. A call built from a
    // constant or template would be skipped by the scan and published unmapped.
    expect(tags.length).toBe(callSites);
  });

  it('only maps to components the catalogue declares', () => {
    const unknown: string[] = [];
    for (const [abstract, entry] of Object.entries(CATALOGUE_COMPONENTS)) {
      for (const type of Object.values(entry.types)) {
        if (!CATALOGUE_TYPES.has(type)) {
          unknown.push(`${abstract} -> ${type}`);
        }
      }
    }
    expect(unknown).toEqual([]);
  });

  it('names a delivery model in every mapped type, bar the model-less EmailSender', () => {
    for (const [abstract, entry] of Object.entries(CATALOGUE_COMPONENTS)) {
      for (const [m, type] of Object.entries(entry.types)) {
        if (abstract === 'Messaging.EmailSender') {
          expect(type).toBe('Messaging.EmailSender');
        } else {
          expect(type.split('.')[1], `${abstract} ${m}`).toBe(m);
        }
      }
    }
  });

  it('has a default the component actually has a type for', () => {
    for (const [abstract, entry] of Object.entries(CATALOGUE_COMPONENTS)) {
      expect(deliveryModelsOf(abstract), abstract).toContain(entry.default);
    }
  });
});

describe('every SDK offer sits on a delivery model its component has', () => {
  it('declares a model the catalogue has a component for, or is exempt', () => {
    const offending: string[] = [];
    let checked = 0;
    for (const value of Object.values(model)) {
      if (typeof value !== 'function') {
        continue;
      }
      let offer: unknown;
      try {
        offer = (value as (cfg: unknown) => unknown)({});
      } catch {
        continue;
      }
      const o = offer as {
        satisfies?: string;
        deliveryModel?: DeliveryModel;
        offerType?: string;
      };
      if (
        typeof o?.satisfies !== 'string' ||
        typeof o.deliveryModel !== 'string' ||
        typeof o.offerType !== 'string'
      ) {
        continue;
      }
      checked += 1;
      const models = deliveryModelsOf(o.satisfies);
      if (
        models.length > 0 &&
        !models.includes(o.deliveryModel) &&
        !DELIVERY_MODEL_EXEMPT_OFFERS.has(o.offerType)
      ) {
        offending.push(`${o.offerType} (${o.deliveryModel}) on ${o.satisfies}`);
      }
    }
    expect(checked).toBeGreaterThan(40);
    expect(offending).toEqual([]);
  });

  it('keeps every exemption pointing at a real offer', () => {
    // Read the offer sources (the generated contracts included): an offer that
    // needs configuration cannot be built without it, but its type is literal.
    const offersDir = join(__dirname, 'offers');
    const sources = readdirSync(offersDir, {recursive: true})
      .map(String)
      .filter(f => f.endsWith('.ts') && !f.includes('.test'))
      .map(f => readFileSync(join(offersDir, f), 'utf8'))
      .join('\n');
    const stale = [...DELIVERY_MODEL_EXEMPT_OFFERS].filter(
      t => !sources.includes(`'${t}'`) && !sources.includes(`"${t}"`),
    );
    expect(stale).toEqual([]);
  });
});

describe('selecting an offer by delivery model', () => {
  const environment = {id: 'test-env'};
  const author = (deliveryModel?: DeliveryModel) =>
    createFractal({
      id: 'spark',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId: {id: 'bc'},
      blueprint: bp => {
        const cluster = bp.add(ComputeCluster({id: 'cluster', deliveryModel}));
        const job = bp.add(DataProcessingJob({id: 'job'}));
        return {cluster, job};
      },
    });

  it('refuses a CaaS offer on a component that is PaaS by default', () => {
    expect(() =>
      author()
        .specialize()
        .toLiveSystem({
          name: 'ls',
          environment,
          select: {
            cluster: CaaSSparkCluster({}),
            job: AwsDatabricksJob({}),
          },
        }),
    ).toThrow(
      /'BigData\.CaaS\.SparkCluster' is CaaS but component 'cluster' \(BigData\.ComputeCluster\) is PaaS by default.*deliveryModel: 'CaaS'/,
    );
  });

  it('refuses a PaaS offer on a component authored as CaaS', () => {
    expect(() =>
      author('CaaS')
        .specialize()
        .toLiveSystem({
          name: 'ls',
          environment,
          select: {
            cluster: AwsDatabricksCluster({}),
            job: AwsDatabricksJob({}),
          },
        }),
    ).toThrow(/is PaaS but component 'cluster'.*CaaS as authored/);
  });

  it('accepts the offer of the component delivery model', () => {
    const ls = author('CaaS')
      .specialize()
      .toLiveSystem({
        name: 'ls',
        environment,
        select: {
          cluster: CaaSSparkCluster({}),
          job: AwsDatabricksJob({}),
        },
      });
    expect(ls.components.map(c => c.deliveryModel)).toEqual(['CaaS', 'PaaS']);
  });

  it('records the stated model on the blueprint, and only when stated', () => {
    const components = author('CaaS').blueprint.components;
    expect(components.find(c => c.id === 'cluster')?.deliveryModel).toBe(
      'CaaS',
    );
    expect(components.find(c => c.id === 'job')).not.toHaveProperty(
      'deliveryModel',
    );
  });

  it('refuses a delivery model the component has no catalogue component for', () => {
    expect(() =>
      ComputeCluster({id: 'c', deliveryModel: 'IaaS' as 'PaaS'}),
    ).toThrow(/no IaaS delivery model/);
  });

  describe('an exempt offer', () => {
    const workload = (deliveryModel?: 'PaaS' | 'CaaS') =>
      createFractal({
        id: 'apps',
        version: {major: 1, minor: 0, patch: 0},
        boundedContextId: {id: 'bc'},
        blueprint: bp => {
          const platform = bp.add(ContainerPlatform({id: 'platform'}));
          const api = bp.add(
            Workload({id: 'api', deliveryModel}).dependsOn(platform),
          );
          return {platform, api};
        },
      });
    const select = {
      platform: AzureContainerAppsEnvironment({
        location: 'westeurope',
        logAnalyticsWorkspaceId: 'ws-1',
        logAnalyticsSharedKey: 'key-1',
      }),
      api: AzureContainerApp({resourceGroup: 'rg-cp'}),
    };

    it('is accepted on the component default model, which is where the catalogue files it', () => {
      const ls = workload()
        .specialize()
        .toLiveSystem({name: 'ls', environment: {id: 'test-env'}, select});
      expect(ls.components.find(c => c.id === 'api')?.type).toBe('CustomWorkloads.PaaS.AzureContainerApp');
    });

    it('is refused once the author states another model, which would publish it where it is not listed', () => {
      expect(() =>
        workload('PaaS')
          .specialize()
          .toLiveSystem({name: 'ls', environment: {id: 'test-env'}, select}),
      ).toThrow(/belongs under the CaaS CustomWorkloads\.Workload.*authored as PaaS.*Leave deliveryModel unset/);
    });
  });
});
