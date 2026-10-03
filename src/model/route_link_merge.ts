/**
 * route_link_merge.ts — one link per (source, target) for gateway routes.
 *
 * The control plane keeps one link per source and target, so a workload that
 * declares routes to the same gateway more than once (a repeatable `withRoute`
 * operation, or a blueprint route plus an operation's) must reach it as ONE
 * link whose `routes.<n>.*` run on. Settings that are not routes (timeouts,
 * retries, the service port) apply to all of the link's routes, so they belong
 * to the first declaration: a later one may repeat them, but one that
 * contradicts them, or adds one the earlier routes did not ask for, is refused
 * rather than silently changing those routes.
 */

const ROUTE_KEY = /^routes\.(\d+)\.(.+)$/;

/** Does a link's settings map carry gateway routes (see `gatewayRouteSettings`)? */
export const isRouteSettings = (settings: Record<string, unknown>): boolean =>
  Object.keys(settings).some(k => ROUTE_KEY.test(k));

/** Group `routes.<n>.<field>` keys into one record per route, in index order. */
const routesOf = (
  settings: Record<string, unknown>,
): Array<Record<string, unknown>> => {
  const byIndex = new Map<number, Record<string, unknown>>();
  for (const [key, value] of Object.entries(settings)) {
    const match = ROUTE_KEY.exec(key);
    if (match === null) {
      continue;
    }
    const n = Number(match[1]);
    byIndex.set(n, {...(byIndex.get(n) ?? {}), [match[2]]: value});
  }
  return [...byIndex.entries()].sort(([a], [b]) => a - b).map(([, r]) => r);
};

/**
 * Merge a further route declaration into an existing route link from the same
 * source to the same target.
 */
export const mergeRouteSettings = (
  sourceId: string,
  targetId: string,
  existing: Record<string, unknown>,
  added: Record<string, unknown>,
): Record<string, unknown> => {
  const merged: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(existing)) {
    if (!ROUTE_KEY.test(key)) {
      merged[key] = value;
    }
  }
  for (const [key, value] of Object.entries(added)) {
    if (ROUTE_KEY.test(key)) {
      continue;
    }
    if (!(key in merged)) {
      throw new Error(
        `Routes from '${sourceId}' to '${targetId}' are one link: ${key} would also ` +
          'apply to the routes declared before, which did not set it. Declare it on ' +
          'the first route declaration.',
      );
    }
    if (merged[key] !== value) {
      throw new Error(
        `Routes from '${sourceId}' to '${targetId}' are one link: ${key} ` +
          `'${String(value)}' contradicts '${String(merged[key])}' declared before. ` +
          'Timeouts, retries and the service port apply to every route of the link.',
      );
    }
  }
  const routes = [...routesOf(existing), ...routesOf(added)];
  const seen = new Set<string>();
  routes.forEach((route, n) => {
    const identity = `${String(route.host ?? '').toLowerCase()} ${String(route.prefix)}`;
    if (seen.has(identity)) {
      throw new Error(
        `Routes from '${sourceId}' to '${targetId}' declare prefix ` +
          `'${String(route.prefix)}' twice for the same host.`,
      );
    }
    seen.add(identity);
    for (const [field, value] of Object.entries(route)) {
      merged[`routes.${n}.${field}`] = value;
    }
  });
  return merged;
};
