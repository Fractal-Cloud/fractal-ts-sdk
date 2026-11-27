/**
 * managed_service_settings.test.ts — executable spec for the managed-service
 * guardrails (`withHaLayout`, `withBackupPolicy`, `withMaintenanceWindow`,
 * `withVersionLine`) and the components added for managed services
 * (KeyValueDbms, DocumentDbms, DataCatalog, DataCatalogTable, BlockVolume).
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import type {AnyNode, Offer} from './core';
import {ContainerPlatform} from './components/network_and_compute';
import {ObjectStorage, Search} from './components/storage';
import {Datalake, DistributedDataProcessing} from './components/big_data';
import {Broker} from './components/messaging';
import {KeyValueDbms} from './components/key_value_dbms';
import {DocumentDbms} from './components/document_dbms';
import {DataCatalog} from './components/data_catalog';
import {DataCatalogTable} from './components/data_catalog_table';
import {BlockVolume} from './components/block_volume';
import {
  AwsS3,
  AzureBlob,
  GcsBucket,
  MinIO,
  OpenshiftPersistentVolume,
  StorageOpenSearch,
} from './offers/storage';
import {
  AwsDatabricks,
  AwsS3Datalake,
  AzureDatabricks,
  AzureDatalake,
  GcpDatabricks,
  GcpDatalake,
} from './offers/big_data';
import {AzureServiceBus, GcpPubSub, Kafka} from './offers/messaging';

const environment = {};
const boundedContextId = {id: 'managed-team'};
const version = {major: 1, minor: 0, patch: 0};

const SETTINGS = {
  withHaLayout: {replicas: 3, spreadZones: true},
  withBackupPolicy: {schedule: '0 1 * * *', retentionDays: 14},
  withMaintenanceWindow: {start: '0 2 * * 0', durationHours: 2},
  withVersionLine: '9.1',
} as const;
const KEYS = {
  withHaLayout: 'haLayout',
  withBackupPolicy: 'backupPolicy',
  withMaintenanceWindow: 'maintenanceWindow',
  withVersionLine: 'versionLine',
} as const;
type Setter = keyof typeof SETTINGS;
const SETTERS = Object.keys(SETTINGS) as Setter[];

type ManagedNode = AnyNode & Record<Setter, (v: unknown) => ManagedNode>;

/** Builds the probe component; a component with more than one delivery model
 *  is authored with the given one, so an offer of that model may be selected. */
type MakeManaged = (deliveryModel?: 'PaaS' | 'CaaS') => ManagedNode;

const MANAGED_COMPONENTS: ReadonlyArray<[string, MakeManaged]> = [
  ['Storage.KeyValueDbms', () => KeyValueDbms({id: 'probe'}) as never],
  ['Storage.DocumentDbms', () => DocumentDbms({id: 'probe'}) as never],
  ['Storage.Search', () => Search({id: 'probe'}) as never],
  [
    'Storage.ObjectStorage',
    deliveryModel => ObjectStorage({id: 'probe', deliveryModel}) as never,
  ],
  [
    'BigData.Datalake',
    deliveryModel => Datalake({id: 'probe', deliveryModel}) as never,
  ],
  [
    'BigData.DataCatalog',
    deliveryModel => DataCatalog({id: 'probe', deliveryModel}) as never,
  ],
  [
    'BigData.DistributedDataProcessing',
    deliveryModel =>
      DistributedDataProcessing({id: 'probe', deliveryModel}) as never,
  ],
  [
    'Messaging.Broker',
    deliveryModel => Broker({id: 'probe', deliveryModel}) as never,
  ],
];

describe('managed-service guardrails', () => {
  it.each(MANAGED_COMPONENTS)('%s locks each one', (type, make) => {
    let node = make();
    expect(node.state.component).toBe(type);
    for (const setter of SETTERS) {
      node = node[setter](SETTINGS[setter]);
    }
    for (const setter of SETTERS) {
      expect(node.state.parameters[KEYS[setter]]).toEqual(SETTINGS[setter]);
      expect(node.state.locked.has(KEYS[setter])).toBe(true);
    }
  });
});

describe('the components added for managed services', () => {
  it.each([
    ['Storage.KeyValueDbms', KeyValueDbms],
    ['Storage.DocumentDbms', DocumentDbms],
    ['BigData.DataCatalog', DataCatalog],
  ] as const)('%s depends on what it runs on', (type, factory) => {
    const platform = ContainerPlatform({id: 'platform'});
    const node = factory({id: 'service'}).dependsOn(platform);
    expect(node.state.component).toBe(type);
    expect(node.state.dependencies).toEqual(['platform']);
  });

  it('a DataCatalogTable depends on its catalog', () => {
    const catalog = DataCatalog({id: 'catalog'});
    const table = DataCatalogTable({id: 'orders', catalog});
    expect(table.state.component).toBe('BigData.DataCatalogTable');
    expect(table.state.dependencies).toEqual(['catalog']);
  });

  it('a BlockVolume locks its size', () => {
    const volume = BlockVolume({id: 'data'}).withSizeGb(20);
    expect(volume.state.component).toBe('Storage.BlockVolume');
    expect(volume.state.parameters.sizeGb).toBe(20);
    expect(volume.state.locked.has('sizeGb')).toBe(true);
  });

  it('a Datalake can depend on what it runs on', () => {
    const platform = ContainerPlatform({id: 'platform'});
    expect(
      Datalake({id: 'lake'}).dependsOn(platform).state.dependencies,
    ).toEqual(['platform']);
  });
});

/** A Live System of one component of `make`'s type, `setter` locked, on
 *  `offer`. The component is authored with the offer's delivery model. */
const oneComponent = (
  make: MakeManaged,
  setter: Setter,
  value: unknown,
  offer: Offer,
) =>
  createFractal({
    id: 'managed',
    version,
    boundedContextId,
    blueprint: bp => ({
      probe: bp.add(
        make(offer.deliveryModel as 'PaaS' | 'CaaS')[setter](value) as never,
      ),
    }),
  }).toLiveSystem({
    name: 'acme-managed',
    environment,
    select: {probe: offer} as never,
  });

const component = (type: string) =>
  MANAGED_COMPONENTS.find(([t]) => t === type)![1];

/** Every existing offer of a component that gained the managed-service setters. */
const EXISTING_OFFERS: ReadonlyArray<[string, string, Offer]> = [
  ['AwsS3', 'Storage.ObjectStorage', AwsS3({} as never)],
  ['AzureBlob', 'Storage.ObjectStorage', AzureBlob({} as never)],
  ['GcsBucket', 'Storage.ObjectStorage', GcsBucket({} as never)],
  ['MinIO', 'Storage.ObjectStorage', MinIO({})],
  [
    'OpenshiftPersistentVolume',
    'Storage.ObjectStorage',
    OpenshiftPersistentVolume({} as never),
  ],
  ['StorageOpenSearch', 'Storage.Search', StorageOpenSearch({})],
  ['AwsS3Datalake', 'BigData.Datalake', AwsS3Datalake({} as never)],
  ['AzureDatalake', 'BigData.Datalake', AzureDatalake({} as never)],
  ['GcpDatalake', 'BigData.Datalake', GcpDatalake({} as never)],
  [
    'AwsDatabricks',
    'BigData.DistributedDataProcessing',
    AwsDatabricks({} as never),
  ],
  [
    'AzureDatabricks',
    'BigData.DistributedDataProcessing',
    AzureDatabricks({} as never),
  ],
  [
    'GcpDatabricks',
    'BigData.DistributedDataProcessing',
    GcpDatabricks({} as never),
  ],
  ['AzureServiceBus', 'Messaging.Broker', AzureServiceBus({} as never)],
  ['GcpPubSub', 'Messaging.Broker', GcpPubSub({} as never)],
  ['Kafka', 'Messaging.Broker', Kafka({})],
];

/** The settings an existing offer translates instead of refusing. */
const TRANSLATED = new Set([
  'MinIO withHaLayout',
  'StorageOpenSearch withHaLayout',
]);

describe('existing offers and the managed-service settings', () => {
  for (const [name, type, offer] of EXISTING_OFFERS) {
    for (const setter of SETTERS) {
      if (TRANSLATED.has(`${name} ${setter}`)) {
        continue;
      }
      it(`${name} refuses ${setter}, naming the parameter and why`, () => {
        expect(() =>
          oneComponent(component(type), setter, SETTINGS[setter], offer),
        ).toThrow(
          new RegExp(
            `Offer ${offer.offerType.replace(/\./g, '\\.')}, selected for 'probe', ` +
              `cannot honor ${setter} \\('${KEYS[setter]}'\\), a guardrail locked ` +
              'in the Fractal: the agent publishes no ',
          ),
        );
      });
    }
  }

  it.each([
    ['MinIO', MinIO({}), 'Storage.ObjectStorage', 'servers'],
    ['StorageOpenSearch', StorageOpenSearch({}), 'Storage.Search', 'replicas'],
  ] as const)(
    '%s sends the layout as its replica key',
    (_name, offer, type, key) => {
      const ls = oneComponent(
        component(type),
        'withHaLayout',
        {replicas: 6},
        offer,
      );
      const [probe] = ls.components;
      expect(probe.parameters[key]).toBe(6);
      expect(probe.parameters).not.toHaveProperty('haLayout');
    },
  );

  it.each([
    ['MinIO', MinIO({}), 'Storage.ObjectStorage'],
    ['StorageOpenSearch', StorageOpenSearch({}), 'Storage.Search'],
  ] as const)(
    '%s refuses spreading over zones, which its agent does not promise',
    (_name, offer, type) => {
      expect(() =>
        oneComponent(
          component(type),
          'withHaLayout',
          {replicas: 3, spreadZones: true},
          offer,
        ),
      ).toThrow('the agent does not promise to spread the replicas over zones');
    },
  );

  it('accepts spreadZones: false, which asks for nothing', () => {
    const ls = oneComponent(
      component('Storage.Search'),
      'withHaLayout',
      {replicas: 1, spreadZones: false},
      StorageOpenSearch({}),
    );
    expect(ls.components[0].parameters.replicas).toBe(1);
  });

  it.each([
    ['MinIO', MinIO({}), 'Storage.ObjectStorage', 0],
    ['StorageOpenSearch', StorageOpenSearch({}), 'Storage.Search', -1],
  ] as const)(
    '%s refuses fewer than one replica at design time',
    (_name, offer, type, replicas) => {
      expect(() =>
        oneComponent(component(type), 'withHaLayout', {replicas}, offer),
      ).toThrow(
        `replicas ${replicas} is below 1: a service needs at least one replica`,
      );
    },
  );

  it('refuses a vendor replica count against the locked layout', () => {
    expect(() =>
      oneComponent(
        component('Storage.ObjectStorage'),
        'withHaLayout',
        {replicas: 6},
        MinIO({servers: 4}),
      ),
    ).toThrow("Parameter 'haLayout' on 'probe' is a locked guardrail");
  });
});
