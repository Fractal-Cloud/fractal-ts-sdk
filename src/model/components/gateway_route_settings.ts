/**
 * gateway_route_settings.ts — the settings of a Workload → gateway route link.
 *
 * The link is OUTBOUND on the workload: the workload's agent creates the routes
 * (on Traefik: an IngressRoute, ReplacePath/Retry middlewares and a
 * ServersTransport in the workload's namespace, deleted with the workload). It
 * therefore works when the gateway is a reference to the platform's Traefik.
 *
 *   bp.link(service, gateway, gatewayRouteSettings({
 *     routes: [{prefix: '/accounts'}],
 *     responseTimeoutMs: 10000,
 *   }));
 *
 * Link settings are a flat map, so the routes travel indexed:
 * `routes.<n>.prefix`, `routes.<n>.rewritePath`, `routes.<n>.host`, plus
 * `responseTimeoutMs`, `idleConnTimeoutMs`, `retryAttempts` and `servicePort`,
 * every value as a string.
 */
import type {GatewayRouteOptions} from './gateway_route_options';

/** A path of URL path characters (and percent escapes), starting with `/`. */
const PATH = /^\/(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/]|%[0-9A-Fa-f]{2})*$/;
const HOST_NAME =
  /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;

const ensureWhole = (
  key: string,
  value: number | undefined,
  min: number,
  max: number,
): void => {
  if (
    value !== undefined &&
    (!Number.isInteger(value) || value < min || value > max)
  ) {
    throw new Error(
      `Gateway route ${key} ${value} is not a whole number from ${min} to ${max}.`,
    );
  }
};

/** Build the settings map of a Workload → gateway route link. */
export const gatewayRouteSettings = (
  options: GatewayRouteOptions,
): Record<string, string> => {
  if (options.routes.length === 0) {
    throw new Error('A gateway route link needs at least one route.');
  }
  const seen = new Set<string>();
  const settings: Record<string, string> = {};
  options.routes.forEach((route, n) => {
    if (!PATH.test(route.prefix)) {
      throw new Error(
        `Gateway route prefix '${route.prefix}' is not a path starting with '/'.`,
      );
    }
    if (route.rewritePath !== undefined && !PATH.test(route.rewritePath)) {
      throw new Error(
        `Gateway route rewritePath '${route.rewritePath}' is not a path starting with '/'.`,
      );
    }
    if (route.host !== undefined && !HOST_NAME.test(route.host)) {
      throw new Error(`Gateway route host '${route.host}' is not a host name.`);
    }
    const key = `${(route.host ?? '').toLowerCase()} ${route.prefix}`;
    if (seen.has(key)) {
      throw new Error(
        `Gateway route prefix '${route.prefix}' twice for the same host: each ` +
          'route of a link must be distinct.',
      );
    }
    seen.add(key);
    settings[`routes.${n}.prefix`] = route.prefix;
    if (route.rewritePath !== undefined) {
      settings[`routes.${n}.rewritePath`] = route.rewritePath;
    }
    if (route.host !== undefined) {
      settings[`routes.${n}.host`] = route.host;
    }
  });
  ensureWhole('responseTimeoutMs', options.responseTimeoutMs, 1, 3_600_000);
  ensureWhole('idleConnTimeoutMs', options.idleConnTimeoutMs, 1, 3_600_000);
  ensureWhole('retryAttempts', options.retryAttempts, 0, 10);
  ensureWhole('servicePort', options.servicePort, 1, 65535);
  for (const key of [
    'responseTimeoutMs',
    'idleConnTimeoutMs',
    'retryAttempts',
    'servicePort',
  ] as const) {
    const value = options[key];
    if (value !== undefined) {
      settings[key] = String(value);
    }
  }
  return settings;
};
