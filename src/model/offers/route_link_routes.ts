/**
 * The routes of a route link to a `TraefikGateway` (see `gatewayRouteSettings`),
 * read and refused as the caas-k8s agent reads them
 * (`internal/gateway/traefik/parse_route_link.go`): a nested `routes` array, when
 * present, replaces the flat `routes.<n>.*` keys; values are read as trimmed text.
 * Internal: not re-exported from the model barrel.
 */
import {isKubernetesName} from './caas_param_checks';

/** The largest index `strconv.Atoi` reads on a 64-bit agent. */
const MAX_INT64 = 9223372036854775807n;

/** One route of a route link: what the gateway matches and rewrites ('' = unset). */
type LinkRoute = {prefix: string; rewritePath: string; host: string};

/**
 * A setting value as the agent's `outputString` reads a scalar: trimmed text, ''
 * when absent. A list or an object is refused (`what` names it): the agent would
 * print it Go-style and refuse the route later for a less useful reason.
 */
const text = (value: unknown, what: string): string => {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'object') {
    throw new Error(`${what} is not text`);
  }
  return String(value).trim();
};

const fromObject = (r: Record<string, unknown>, name: string): LinkRoute => ({
  prefix: text(r.prefix, `${name}.prefix`),
  rewritePath: text(r.rewritePath, `${name}.rewritePath`),
  host: text(r.host, `${name}.host`),
});

/**
 * The routes of `settings`, in order. Throws, with the agent's message, on a
 * shape the agent refuses: a nested entry that is not an object, a flat key that
 * is not `routes.<n>.<prefix|rewritePath|host>`, a route without a prefix.
 */
export const parseRouteLink = (
  settings: Readonly<Record<string, unknown>>,
): LinkRoute[] => {
  const nested = settings.routes;
  if (Array.isArray(nested)) {
    return nested.map((item: unknown, i) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new Error(`routes[${i}] is not an object`);
      }
      const route = fromObject(item as Record<string, unknown>, `routes[${i}]`);
      if (route.prefix === '') {
        throw new Error(`routes[${i}].prefix is required`);
      }
      return route;
    });
  }
  // Keyed by the exact index, as the agent's map[int]: a Number would merge
  // indexes beyond 2^53.
  const byIndex = new Map<bigint, Record<string, unknown>>();
  for (const [key, value] of Object.entries(settings)) {
    if (!key.startsWith('routes.')) {
      continue;
    }
    const rest = key.slice('routes.'.length);
    const dot = rest.indexOf('.');
    const index = dot < 0 ? '' : rest.slice(0, dot);
    // strconv.Atoi's grammar (an optional sign) and range (int64), and no
    // negative index.
    if (
      !/^[+-]?\d+$/.test(index) ||
      BigInt(index) < 0n ||
      BigInt(index) > MAX_INT64
    ) {
      throw new Error(`route setting "${key}" is not routes.<n>.<field>`);
    }
    const field = rest.slice(dot + 1);
    if (!['prefix', 'rewritePath', 'host'].includes(field)) {
      throw new Error(
        `route setting "${key}" is not one of prefix, rewritePath, host`,
      );
    }
    const n = BigInt(index);
    text(value, `route setting "${key}"`);
    byIndex.set(n, {...(byIndex.get(n) ?? {}), [field]: value});
  }
  return [...byIndex.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([n, r]) => {
      const route = fromObject(r, `routes.${n}`);
      if (route.prefix === '') {
        throw new Error(`routes.${n}.prefix is required`);
      }
      return route;
    });
};

/**
 * Why the agent refuses `route` (its host already defaulted to the gateway's),
 * or undefined. With `hostKnown` false (a referenced gateway, whose default host
 * is not known here) a route without a host is not judged on its host.
 */
export const routeRefusal = (
  route: LinkRoute,
  hostKnown = true,
): string | undefined => {
  if (!route.prefix.startsWith('/')) {
    return `route prefix "${route.prefix}" must start with "/"`;
  }
  if (route.rewritePath !== '' && !route.rewritePath.startsWith('/')) {
    return `route rewritePath "${route.rewritePath}" must start with "/"`;
  }
  if (route.host === '' && !hostKnown) {
    return route.prefix.includes('`')
      ? `route value "${route.prefix}" contains a backtick, which a Traefik rule cannot quote`
      : undefined;
  }
  if (route.host === '') {
    return `route ${route.prefix} has no host, and the gateway publishes no default host`;
  }
  const quoted = [route.prefix, route.host].find(v => v.includes('`'));
  if (quoted !== undefined) {
    return `route value "${quoted}" contains a backtick, which a Traefik rule cannot quote`;
  }
  if (!isKubernetesName(route.host.toLowerCase())) {
    return `route host "${route.host}" is not a DNS name`;
  }
  return undefined;
};
