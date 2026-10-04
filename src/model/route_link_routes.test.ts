/**
 * route_link_routes.test.ts — the routes of a route link to a TraefikGateway,
 * read and refused as the caas-k8s agent reads them
 * (`internal/gateway/traefik/parse_route_link.go`).
 */
import {describe, it, expect} from 'vitest';
import {parseRouteLink, routeRefusal} from './offers/route_link_routes';

describe('parseRouteLink', () => {
  it('orders sparse, unordered flat indexes', () => {
    expect(
      parseRouteLink({
        'routes.7.prefix': '/b',
        'routes.2.prefix': '/a',
        'routes.2.host': ' api.fractal.cloud ',
        responseTimeoutMs: '1000',
      }),
    ).toEqual([
      {prefix: '/a', rewritePath: '', host: 'api.fractal.cloud'},
      {prefix: '/b', rewritePath: '', host: ''},
    ]);
  });

  it('reads a nested routes array instead of the flat keys', () => {
    expect(
      parseRouteLink({
        routes: [{prefix: '/nested', rewritePath: '/'}],
        'routes.0.prefix': '/flat',
      }),
    ).toEqual([{prefix: '/nested', rewritePath: '/', host: ''}]);
  });

  it('reads a non-string value as its text, as the agent does', () => {
    expect(parseRouteLink({'routes.0.prefix': 5})).toEqual([
      {prefix: '5', rewritePath: '', host: ''},
    ]);
  });

  it('finds no routes in settings without route keys', () => {
    expect(parseRouteLink({})).toEqual([]);
  });

  it.each([
    [{routes: ['/a']}, /routes\[0\] is not an object/],
    [{routes: [{host: 'a.b'}]}, /routes\[0\]\.prefix is required/],
    [
      {'routes.x.prefix': '/a'},
      /route setting "routes.x.prefix" is not routes.<n>.<field>/,
    ],
    [{'routes.0': '/a'}, /route setting "routes.0" is not routes.<n>.<field>/],
    [
      {'routes.0.prefix': '/a', 'routes.0.path': '/b'},
      /route setting "routes.0.path" is not one of prefix, rewritePath, host/,
    ],
    [{'routes.3.host': 'a.b'}, /routes\.3\.prefix is required/],
  ])('refuses %o', (settings, reason) => {
    expect(() => parseRouteLink(settings)).toThrow(reason);
  });
});

describe('routeRefusal', () => {
  const route = (
    r: Partial<{prefix: string; rewritePath: string; host: string}>,
  ) => ({
    prefix: '/a',
    rewritePath: '',
    host: 'api.fractal.cloud',
    ...r,
  });

  it('accepts a well-formed route', () => {
    expect(routeRefusal(route({}))).toBeUndefined();
  });

  it.each([
    [{prefix: 'a/'}, 'route prefix "a/" must start with "/"'],
    [{rewritePath: 'x'}, 'route rewritePath "x" must start with "/"'],
    [
      {host: ''},
      'route /a has no host, and the gateway publishes no default host',
    ],
    [
      {prefix: '/a`b'},
      'route value "/a`b" contains a backtick, which a Traefik rule cannot quote',
    ],
    [
      {host: 'not_dns.example'},
      'route host "not_dns.example" is not a DNS name',
    ],
  ])('refuses %o', (r, reason) => {
    expect(routeRefusal(route(r))).toBe(reason);
  });
});
