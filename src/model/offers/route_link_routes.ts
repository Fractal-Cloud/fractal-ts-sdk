/**
 * The routes of a route link to a `TraefikGateway` (see `gatewayRouteSettings`),
 * read as the caas-k8s agent reads them: a nested `routes` array, when present,
 * replaces the flat `routes.<n>.*` keys. Internal: not re-exported from the model
 * barrel.
 */

const FLAT_ROUTE_KEY = /^routes\.(\d+)\.(prefix|rewritePath|host)$/;

const text = (value: unknown): string | undefined =>
  typeof value === 'string' ? value.trim() : undefined;

/** One route of a route link: what the gateway matches and rewrites. */
type LinkRoute = {prefix?: string; rewritePath?: string; host?: string};

export const routesOfLink = (
  settings: Readonly<Record<string, unknown>>,
): LinkRoute[] => {
  const nested = settings.routes;
  if (Array.isArray(nested)) {
    return nested
      .filter(
        (r): r is Record<string, unknown> =>
          typeof r === 'object' && r !== null,
      )
      .map(r => ({
        prefix: text(r.prefix),
        rewritePath: text(r.rewritePath),
        host: text(r.host),
      }));
  }
  const byIndex = new Map<number, LinkRoute>();
  for (const [key, value] of Object.entries(settings)) {
    const match = FLAT_ROUTE_KEY.exec(key);
    if (match === null) {
      continue;
    }
    const n = Number(match[1]);
    byIndex.set(n, {...(byIndex.get(n) ?? {}), [match[2]]: text(value)});
  }
  return [...byIndex.entries()].sort(([a], [b]) => a - b).map(([, r]) => r);
};
