/**
 * offers/traefik_route_links.ts — the route links workloads declare to a
 * `TraefikGateway`, checked as the caas-k8s agent checks them
 * (`internal/gateway/traefik/parse_route_link.go`, `route_conflicts.go`).
 *
 * A Kubernetes workload adds its routes with a link to the gateway. The agent
 * refuses a link without a route, a route it cannot write as a Traefik rule, a
 * route without a host when the gateway publishes no default one, and a route
 * that would take traffic another workload serves: two routes overlap when they
 * have the same host and one prefix starts with the other, except that a
 * catch-all "/" coexists with longer prefixes. Internal.
 */
import type {LiveSystemComponent} from '../core';
import type {ComponentValidator} from './component_validator';
import {
  KUBERNETES_WORKLOAD_OFFER_TYPE,
  TRAEFIK_GATEWAY_OFFER_TYPE,
} from './offer_type_ids';
import {parseRouteLink, routeRefusal} from './route_link_routes';

/** The source types whose links to a gateway are route links. */
const ROUTE_SOURCES = [
  KUBERNETES_WORKLOAD_OFFER_TYPE,
  'Observability.CaaS.KubePrometheusStack',
];

type ServedRoute = {
  source: string;
  gateway: string;
  host: string;
  prefix: string;
};

const refuseRoute = (source: string, gateway: string, why: string): never => {
  throw new Error(`Route link from '${source}' to '${gateway}': ${why}.`);
};

const gatewayHost = (gateway: LiveSystemComponent): string =>
  typeof gateway.parameters.host === 'string'
    ? gateway.parameters.host.trim()
    : '';

/** The routes of every route link to a TraefikGateway in the Live System. */
const servedRoutes = (all: readonly LiveSystemComponent[]): ServedRoute[] =>
  all.flatMap(source =>
    ROUTE_SOURCES.includes(source.type)
      ? source.links.flatMap(link => {
          const gateway = all.find(c => c.id === link.componentId);
          if (gateway?.type !== TRAEFIK_GATEWAY_OFFER_TYPE) {
            return [];
          }
          let routes: ReturnType<typeof parseRouteLink> = [];
          try {
            routes = parseRouteLink(link.settings);
          } catch {
            return [];
          }
          return routes
            .map(r => ({
              source: source.id,
              gateway: gateway.id,
              host: (r.host || gatewayHost(gateway)).toLowerCase(),
              prefix: r.prefix,
            }))
            .filter(r => r.host !== '');
        })
      : [],
  );

const overlaps = (a: ServedRoute, b: ServedRoute): boolean => {
  if (a.host !== b.host) {
    return false;
  }
  if (a.prefix === b.prefix) {
    return true;
  }
  if (a.prefix === '/' || b.prefix === '/') {
    return false;
  }
  return a.prefix.startsWith(b.prefix) || b.prefix.startsWith(a.prefix);
};

/**
 * Every workload route link to this gateway carries routes the agent can
 * serve, and no two workloads claim overlapping routes.
 */
export const workloadRouteLinks: ComponentValidator = (self, all) => {
  const hostKnown = self.reference === undefined;
  for (const source of all) {
    if (source.type !== KUBERNETES_WORKLOAD_OFFER_TYPE) {
      continue;
    }
    for (const link of source.links) {
      if (link.componentId !== self.id) {
        continue;
      }
      let routes: ReturnType<typeof parseRouteLink> = [];
      try {
        routes = parseRouteLink(link.settings);
      } catch (e) {
        refuseRoute(
          source.id,
          self.id,
          e instanceof Error ? e.message : String(e),
        );
      }
      if (routes.length === 0) {
        refuseRoute(
          source.id,
          self.id,
          'the link has no routes: set routes.0.prefix (see gatewayRouteSettings)',
        );
      }
      for (const parsed of routes) {
        const route = {...parsed, host: parsed.host || gatewayHost(self)};
        const refusal = routeRefusal(route, hostKnown);
        if (refusal !== undefined) {
          refuseRoute(source.id, self.id, refusal);
        }
      }
    }
  }
  const served = servedRoutes(all);
  for (const route of served.filter(r => r.gateway === self.id)) {
    const other = served.find(
      o => o.source !== route.source && overlaps(route, o),
    );
    if (other !== undefined) {
      refuseRoute(
        route.source,
        self.id,
        `route ${route.host}${route.prefix} overlaps route ${other.host}${other.prefix} of ` +
          `'${other.source}': the agent refuses a route that takes traffic another workload ` +
          "serves. Change one prefix so that it neither starts with nor is the start of the other's",
      );
    }
  }
};
