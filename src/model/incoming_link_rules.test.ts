/**
 * incoming_link_rules.test.ts — executable spec for `Offer.incomingLinks`: the
 * settings of each link made to a component reach that component's agent as
 * the target's offer receives them, before any offer's `validate` runs.
 */
import {describe, it, expect} from 'vitest';
import {createFractal, defineOffer} from './core';
import type {LiveSystemComponent} from './core';
import {ContainerPlatform} from './components/network_and_compute';
import {Workload} from './components/custom_workloads';
import {Search} from './components/storage';
import {Tracing} from './components/observability';
import {searchLinkSettings} from './components/search_link_settings';
import {StorageOpenSearch} from './offers/storage';
import {Jaeger} from './offers/observability';
import {K8sWorkload} from './offers/custom_workloads';
import {Eks} from './offers/network_and_compute';
import {liveSystemIdOf, referenceTo} from './reference';

const environment = {};
const boundedContextId = {id: 'search-team'};
const version = {major: 1, minor: 0, patch: 0};

type Seen = {settings: Record<string, unknown>[]};

/**
 * A search offer whose agent reads `mode` for `access`, refuses `access:
 * 'write'`, and records what its `validate` sees.
 */
const translatingSearch = (seen: Seen) =>
  defineOffer<'Storage.Search', {grant: string}>({
    satisfies: 'Storage.Search',
    offerType: 'Storage.CaaS.TranslatingSearch',
    provider: 'FractalCloud',
    deliveryModel: 'CaaS',
    incomingLinks: (settings, {from, target}, config) => {
      if (settings.access === 'write') {
        throw new Error(
          `Live component '${target.id}': the link from '${from.id}' is refused: write grants nothing.`,
        );
      }
      const {access, ...rest} = settings;
      return {...rest, mode: access, grant: config.grant};
    },
    validate: (self, all) => {
      for (const c of all) {
        for (const link of c.links) {
          if (link.componentId === self.id) {
            seen.settings.push({...link.settings});
          }
        }
      }
    },
  });

/** A workload on a cluster linking to `search` with these settings. */
const stack = (
  settings: Record<string, unknown>,
  search: Parameters<typeof select>[0],
) =>
  createFractal({
    id: 'orders',
    version,
    boundedContextId,
    blueprint: bp => {
      const platform = bp.add(ContainerPlatform({id: 'platform'}));
      const searchNode = bp.add(Search({id: 'search'}).dependsOn(platform));
      const orders = bp.add(
        Workload({id: 'orders'})
          .withImage('registry/orders:1.0.0')
          .dependsOn(platform),
      );
      bp.link(orders, searchNode, settings);
      return {platform, search: searchNode, orders};
    },
  }).toLiveSystem({name: 'acme-orders', environment, select: select(search)});

const select = (search: ReturnType<typeof StorageOpenSearch>) => ({
  platform: Eks({region: 'eu-central-1'}),
  search,
  orders: K8sWorkload({}),
});

const linkOf = (components: readonly LiveSystemComponent[], id: string) =>
  components.find(c => c.id === id)!.links;

describe('Offer.incomingLinks', () => {
  it('reaches the agent in the settings the target offer receives', () => {
    const seen: Seen = {settings: []};
    const ls = stack(
      {access: 'read', indexPrefix: 'orders-'},
      translatingSearch(seen)({grant: 'g1'}) as never,
    );
    expect(linkOf(ls.components, 'orders')).toEqual([
      {
        componentId: 'search',
        settings: {indexPrefix: 'orders-', mode: 'read', grant: 'g1'},
      },
    ]);
  });

  it("runs before every offer's validate, which sees the translated settings", () => {
    const seen: Seen = {settings: []};
    stack({access: 'read'}, translatingSearch(seen)({grant: 'g2'}) as never);
    expect(seen.settings).toEqual([{mode: 'read', grant: 'g2'}]);
  });

  it("refuses a link the target's agent would grant nothing for", () => {
    expect(() =>
      stack(
        {access: 'write'},
        translatingSearch({settings: []})({grant: 'g'}) as never,
      ),
    ).toThrow(
      "Live component 'search': the link from 'orders' is refused: write grants nothing.",
    );
  });

  it('is absent from an offer that declares none', () => {
    expect('incomingLinks' in Eks({region: 'eu-central-1'})).toBe(false);
    expect('incomingLinks' in K8sWorkload({})).toBe(false);
  });

  it('leaves the links to a target without a rule as the blueprint wrote them', () => {
    const ls = createFractal({
      id: 'platform-only',
      version,
      boundedContextId,
      blueprint: bp => {
        const platform = bp.add(ContainerPlatform({id: 'platform'}));
        const orders = bp.add(
          Workload({id: 'orders'})
            .withImage('registry/orders:1.0.0')
            .dependsOn(platform),
        );
        bp.link(orders, platform, {anything: 'kept'});
        return {platform, orders};
      },
    }).toLiveSystem({
      name: 'acme',
      environment,
      select: {
        platform: Eks({region: 'eu-central-1'}),
        orders: K8sWorkload({}),
      },
    });
    expect(linkOf(ls.components, 'orders')).toEqual([
      {componentId: 'platform', settings: {anything: 'kept'}},
    ]);
  });

  it('reaches a component of another Live System through referenceTo', () => {
    const offer = translatingSearch({settings: []});
    const reference = referenceTo(offer({grant: 'unused'}), {
      liveSystemId: liveSystemIdOf(
        {
          ownerType: 'Organizational',
          ownerId: '00000000-0000-0000-0000-000000000001',
          name: 'platform',
        },
        'shared-platform',
      ),
      componentId: 'opensearch',
    });
    expect(reference.incomingLinks).toBeDefined();
    const ls = stack({access: 'read'}, reference as never);
    expect(linkOf(ls.components, 'orders')[0].settings).toEqual({
      mode: 'read',
      grant: 'unused',
    });
  });

  it('carries no rule through referenceTo when the referenced offer has none', () => {
    const reference = referenceTo(Eks, {
      liveSystemId: liveSystemIdOf(
        {
          ownerType: 'Organizational',
          ownerId: '00000000-0000-0000-0000-000000000001',
          name: 'platform',
        },
        'shared-platform',
      ),
      componentId: 'eks',
    });
    expect('incomingLinks' in reference).toBe(false);
  });

  it('names its offer with a provider of the new managed services', () => {
    const ls = stack(
      {access: 'read'},
      translatingSearch({settings: []})({grant: 'g'}) as never,
    );
    expect(ls.components.find(c => c.id === 'search')!.provider).toBe(
      'FractalCloud',
    );
  });
});

describe('a catalog-shaped search link to StorageOpenSearch', () => {
  it('reaches the agent as the index prefix it grants', () => {
    const ls = stack(
      searchLinkSettings({accessMode: 'readWrite', indexPattern: 'orders-*'}),
      StorageOpenSearch({}),
    );
    expect(linkOf(ls.components, 'orders')).toEqual([
      {
        componentId: 'search',
        settings: {accessMode: 'readWrite', indexPrefix: 'orders-'},
      },
    ]);
  });

  it('reaches the agent unchanged without a pattern', () => {
    const ls = stack(
      searchLinkSettings({accessMode: 'read'}),
      StorageOpenSearch({}),
    );
    expect(linkOf(ls.components, 'orders')[0].settings).toEqual({
      accessMode: 'read',
    });
  });

  it('keeps the legacy settings byte for byte', () => {
    const ls = stack(
      searchLinkSettings({access: 'read-write', indexPrefix: 'orders-'}),
      StorageOpenSearch({}),
    );
    expect(JSON.stringify(linkOf(ls.components, 'orders'))).toBe(
      JSON.stringify([
        {
          componentId: 'search',
          settings: {access: 'read-write', indexPrefix: 'orders-'},
        },
      ]),
    );
  });

  it.each([
    [
      'a pattern that is not a prefix',
      {accessMode: 'read', indexPattern: 'orders-*-x'},
      "indexPattern 'orders-*-x' is not '<prefix>*'",
    ],
    [
      'a bare wildcard',
      {accessMode: 'read', indexPattern: '*'},
      "indexPattern '*' is not '<prefix>*'",
    ],
    [
      'a pattern without a wildcard',
      {accessMode: 'read', indexPattern: 'orders'},
      "indexPattern 'orders' is not '<prefix>*'",
    ],
  ])('refuses %s, which its agent cannot grant', (_name, settings, reason) => {
    expect(() => stack(settings, StorageOpenSearch({}))).toThrow(
      `Live component 'search': the link from 'orders' is refused: ${reason}`,
    );
  });

  it('refuses a link that sets both indexPrefix and indexPattern', () => {
    expect(() =>
      stack(
        {accessMode: 'read', indexPrefix: 'a-', indexPattern: 'b-*'},
        StorageOpenSearch({}),
      ),
    ).toThrow(
      "the link from 'orders' is refused: it sets both indexPrefix and indexPattern: set one",
    );
  });
});

describe('searchLinkSettings in the catalog vocabulary', () => {
  it('builds accessMode and indexPattern verbatim', () => {
    expect(
      searchLinkSettings({accessMode: 'readWrite', indexPattern: 'app-*'}),
    ).toEqual({accessMode: 'readWrite', indexPattern: 'app-*'});
    expect(searchLinkSettings({accessMode: 'write'})).toEqual({
      accessMode: 'write',
    });
  });

  it.each([
    [
      'a blank pattern',
      {accessMode: 'read', indexPattern: ' '},
      'indexPattern is blank',
    ],
    [
      'an upper-case pattern',
      {accessMode: 'read', indexPattern: 'App-*'},
      "indexPattern 'App-*' may hold only",
    ],
    [
      'an unknown accessMode',
      {accessMode: 'all'},
      "accessMode 'all' is not one of",
    ],
  ])('refuses %s', (_name, link, reason) => {
    expect(() => searchLinkSettings(link as never)).toThrow(
      `Search link refused: ${reason}`,
    );
  });
});

describe('Jaeger with a catalog-shaped link', () => {
  it('keeps the indexPattern it was given, which reaches OpenSearch as a prefix', () => {
    const ls = createFractal({
      id: 'tracing',
      version,
      boundedContextId,
      blueprint: bp => {
        const search = bp.add(Search({id: 'search'}));
        const traces = bp.add(Tracing({id: 'traces'}).dependsOn(search));
        bp.link(
          traces,
          search,
          searchLinkSettings({
            accessMode: 'readWrite',
            indexPattern: 'spans-*',
          }),
        );
        return {search, traces};
      },
    }).toLiveSystem({
      name: 'acme-tracing',
      environment,
      select: {search: StorageOpenSearch({}), traces: Jaeger({})},
    });
    expect(linkOf(ls.components, 'traces')).toEqual([
      {
        componentId: 'search',
        settings: {accessMode: 'readWrite', indexPrefix: 'spans-'},
      },
    ]);
  });
});
