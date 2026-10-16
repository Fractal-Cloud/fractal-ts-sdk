/**
 * search.test.ts — executable spec for the Search component, the caas-k8s
 * OpenSearch offer, the consumer → search link, and Jaeger keeping its traces
 * in OpenSearch.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {ContainerPlatform} from './components/network_and_compute';
import {Tracing} from './components/observability';
import {Workload} from './components/custom_workloads';
import {Search} from './components/storage';
import {searchLinkSettings} from './components/search_link_settings';
import {StorageOpenSearch} from './offers/storage';
import {Jaeger} from './offers/observability';
import {K8sWorkload} from './offers/custom_workloads';
import {Eks} from './offers/network_and_compute';
import {liveSystemIdOf, referenceTo} from './reference';

const environment = {};
const boundedContextId = {id: 'search-team'};
const version = {major: 1, minor: 0, patch: 0};

describe('Search component and the StorageOpenSearch offer', () => {
  it('is the abstract Storage.Search contract in the blueprint', () => {
    const fractal = createFractal({
      id: 'search-stack',
      version,
      boundedContextId,
      blueprint: bp => {
        const platform = bp.add(ContainerPlatform({id: 'platform'}));
        const search = bp.add(Search({id: 'search'}).dependsOn(platform));
        return {platform, search};
      },
    });
    const search = fractal.blueprint.components.find(c => c.id === 'search')!;
    expect(search.component).toBe('Storage.Search');
    expect(search.dependencies).toEqual(['platform']);
  });

  it('emits Storage.CaaS.OpenSearch with only the keys set', () => {
    const ls = createFractal({
      id: 'search-stack',
      version,
      boundedContextId,
      blueprint: bp => ({search: bp.add(Search({id: 'search'}))}),
    }).toLiveSystem({
      name: 'acme-search',
      environment,
      select: {
        search: StorageOpenSearch({
          namespace: 'search',
          replicas: 3,
          storage: '200Gi',
          storageClassName: 'fractal-gp3',
          memory: '4Gi',
          cpu: '1',
          dashboards: true,
          values: {config: {}},
        }),
      },
    });
    const [search] = ls.components;
    expect(search.type).toBe('Storage.CaaS.OpenSearch');
    expect(search.deliveryModel).toBe('CaaS');
    expect(search.provider).toBeUndefined();
    expect(search.parameters).toEqual({
      namespace: 'search',
      replicas: 3,
      storage: '200Gi',
      storageClassName: 'fractal-gp3',
      memory: '4Gi',
      cpu: '1',
      dashboards: true,
      values: {config: {}},
    });
    expect(
      createFractal({
        id: 'search-stack',
        version,
        boundedContextId,
        blueprint: bp => ({search: bp.add(Search({id: 'search'}))}),
      }).toLiveSystem({
        name: 'acme-search',
        environment,
        select: {search: StorageOpenSearch({})},
      }).components[0].parameters,
    ).toEqual({});
  });

  it.each([0, 1.5, -1])('refuses replicas %s', replicas => {
    expect(() =>
      createFractal({
        id: 'search-stack',
        version,
        boundedContextId,
        blueprint: bp => ({search: bp.add(Search({id: 'search'}))}),
      }).toLiveSystem({
        name: 'acme-search',
        environment,
        select: {search: StorageOpenSearch({replicas})},
      }),
    ).toThrow(`replicas ${replicas} is not a whole number of at least 1`);
  });
});

describe('searchLinkSettings', () => {
  it.each(['read', 'write', 'read-write'] as const)(
    'carries access %s',
    access => {
      expect(searchLinkSettings({access})).toEqual({access});
    },
  );

  it('carries an index prefix when set', () => {
    expect(
      searchLinkSettings({access: 'read', indexPrefix: 'orders_v2.'}),
    ).toEqual({access: 'read', indexPrefix: 'orders_v2.'});
  });

  it.each([
    ['a blank prefix', {access: 'read', indexPrefix: '  '}, /is blank/],
    ['a wildcard', {access: 'read', indexPrefix: 'logs-*'}, /no wildcards/],
    ['upper case', {access: 'read', indexPrefix: 'Orders-'}, /no upper case/],
    ['a slash', {access: 'read', indexPrefix: 'a/b'}, /lower-case letters/],
    ['an unknown access', {access: 'admin'}, /access 'admin' is not one of/],
    ['no access', {}, /sets no access/],
  ])('refuses %s', (_name, link, reason) => {
    expect(() => searchLinkSettings(link as never)).toThrow(reason);
  });
});

/** A workload on a cluster linking to an OpenSearch with these settings. */
const workloadStack = (settings: Record<string, unknown>) =>
  createFractal({
    id: 'orders',
    version,
    boundedContextId,
    blueprint: bp => {
      const platform = bp.add(ContainerPlatform({id: 'platform'}));
      const search = bp.add(Search({id: 'search'}).dependsOn(platform));
      const orders = bp.add(
        Workload({id: 'orders'})
          .withImage('registry/orders:1.0.0')
          .dependsOn(platform),
      );
      bp.link(orders, search, settings);
      return {platform, search, orders};
    },
  }).toLiveSystem({
    name: 'acme-orders',
    environment,
    select: {
      platform: Eks({region: 'eu-central-1'}),
      search: StorageOpenSearch({}),
      orders: K8sWorkload({}),
    },
  });

describe('consumer → OpenSearch link', () => {
  it('reaches the wire as access and indexPrefix', () => {
    const ls = workloadStack(
      searchLinkSettings({access: 'read', indexPrefix: 'orders-'}),
    );
    const orders = ls.components.find(c => c.id === 'orders')!;
    expect(orders.links).toEqual([
      {
        componentId: 'search',
        settings: {access: 'read', indexPrefix: 'orders-'},
      },
    ]);
  });

  it('accepts the catalogue spelling accessMode', () => {
    expect(() => workloadStack({accessMode: 'readWrite'})).not.toThrow();
  });

  it.each([
    ['no access', {}, "the link from 'orders' is refused: it sets no access"],
    [
      'a wildcard prefix',
      {access: 'read', indexPrefix: '*'},
      "the link from 'orders' is refused: indexPrefix '*' may hold only",
    ],
    [
      'an unknown accessMode',
      {accessMode: 'all'},
      "the link from 'orders' is refused: accessMode 'all' is not one of",
    ],
  ])('refuses a raw link with %s', (_name, settings, reason) => {
    expect(() => workloadStack(settings)).toThrow(reason);
  });
});

type JaegerOptions = {
  link?: Record<string, unknown> | 'none';
  dependsOn?: boolean;
  searches?: number;
  config?: Record<string, unknown>;
};

/** Jaeger with its OpenSearch, as the options say. */
const jaegerStack = (opts: JaegerOptions = {}) =>
  createFractal({
    id: 'tracing',
    version,
    boundedContextId,
    blueprint: bp => {
      const searches = Array.from({length: opts.searches ?? 1}, (_, n) =>
        bp.add(Search({id: n === 0 ? 'search' : `search-${n}`})),
      );
      let t = Tracing({id: 'traces'});
      if (opts.dependsOn ?? true) {
        for (const s of searches) {
          t = t.dependsOn(s);
        }
      }
      const traces = bp.add(t);
      if (opts.link !== 'none') {
        for (const s of searches) {
          bp.link(
            traces,
            s,
            opts.link ?? searchLinkSettings({access: 'read-write'}),
          );
        }
      }
      return Object.fromEntries([
        ['traces', traces],
        ...searches.map(s => [s.state.id, s]),
      ]) as {traces: typeof traces; search: (typeof searches)[number]};
    },
  }).toLiveSystem({
    name: 'acme-tracing',
    environment,
    select: {
      traces: Jaeger((opts.config ?? {}) as never),
      search: StorageOpenSearch({}),
      ...Object.fromEntries(
        Array.from({length: (opts.searches ?? 1) - 1}, (_, n) => [
          `search-${n + 1}`,
          StorageOpenSearch({}),
        ]),
      ),
    },
  });

describe('Jaeger keeps its traces in OpenSearch', () => {
  it('links read-write with the index prefix <id>-jaeger- by default', () => {
    const traces = jaegerStack().components.find(c => c.id === 'traces')!;
    expect(traces.type).toBe('Observability.CaaS.Jaeger');
    expect(traces.dependencies).toEqual(['search']);
    expect(traces.links).toEqual([
      {
        componentId: 'search',
        settings: {access: 'read-write', indexPrefix: 'traces-jaeger-'},
      },
    ]);
    expect(traces.parameters).toEqual({});
  });

  it('keeps an index prefix set on the link', () => {
    const traces = jaegerStack({
      link: searchLinkSettings({access: 'read-write', indexPrefix: 'spans-'}),
    }).components.find(c => c.id === 'traces')!;
    expect(traces.links[0].settings.indexPrefix).toBe('spans-');
  });

  it('works with an OpenSearch of another Live System', () => {
    const ls = createFractal({
      id: 'tracing',
      version,
      boundedContextId,
      blueprint: bp => {
        const search = bp.add(Search({id: 'search'}));
        const traces = bp.add(Tracing({id: 'traces'}).dependsOn(search));
        bp.link(traces, search, searchLinkSettings({access: 'read-write'}));
        return {search, traces};
      },
    }).toLiveSystem({
      name: 'acme-tracing',
      environment,
      select: {
        search: referenceTo(StorageOpenSearch, {
          liveSystemId: liveSystemIdOf(
            {
              ownerType: 'Organizational',
              ownerId: '00000000-0000-0000-0000-000000000001',
              name: 'platform',
            },
            'shared-platform',
          ),
          componentId: 'opensearch',
        }),
        traces: Jaeger({}),
      },
    });
    const search = ls.components.find(c => c.id === 'search')!;
    expect(search.type).toBe('Storage.CaaS.OpenSearch');
    expect(search.reference?.componentId).toBe('opensearch');
  });

  it.each<[string, JaegerOptions, string | RegExp]>([
    [
      'no OpenSearch link',
      {link: 'none'},
      "Live component 'traces' keeps its traces in OpenSearch: link it to a Storage.CaaS.OpenSearch component",
    ],
    [
      'two OpenSearch links',
      {searches: 2},
      'it links to 2 OpenSearch components; link exactly one',
    ],
    [
      'read access',
      {link: searchLinkSettings({access: 'read'})},
      "the link to OpenSearch 'search' needs access read-write, got 'read'",
    ],
    [
      'accessMode write',
      {link: {accessMode: 'write'}},
      "needs access read-write, got 'write'",
    ],
    [
      'no dependency',
      {dependsOn: false},
      "it links to OpenSearch 'search' but does not depend on it",
    ],
    [
      'storageSettings',
      {config: {storageSettings: {}}},
      'storageSettings is no longer read',
    ],
    [
      'storageClassName',
      {config: {storageClassName: 'gp3'}},
      'storageClassName is no longer read',
    ],
  ])('refuses %s', (_name, opts, reason) => {
    expect(() => jaegerStack(opts)).toThrow(reason);
  });

  it('accepts accessMode readWrite', () => {
    expect(() => jaegerStack({link: {accessMode: 'readWrite'}})).not.toThrow();
  });
});
