/**
 * api_management.test.ts — executable spec for the APIManagement domain on the
 * LOCKED Fractal model. Authors a vendor-agnostic Fractal with a single
 * ApiGateway, applies guardrails, specializes via a dev-open route op, and
 * selects offers at LiveSystem time.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {ApiGateway, Route} from './components/api_management';
import {AwsCloudFront, Ambassador} from './offers/api_management';

const environment = {};
const boundedContextId = {id: 'reusable-templates'};

function authorFractal() {
  return createFractal({
    id: 'api-management-sample',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const gateway = bp.add(
        ApiGateway({id: 'api-gateway'})
          .withHttpsOnly(true)
          .withRateLimit({requestsPerSecond: 1000}),
      );
      return {gateway};
    },
    operations: s => ({
      // dev-open semantic op: append a route into the open `routes` slot.
      withRoute: (r: Route) => s.gateway.append('routes', r),
    }),
  });
}

describe('Locked Fractal model — APIManagement', () => {
  it('blueprint component is the abstract APIManagement.ApiGateway with locked guardrails', () => {
    const bp = authorFractal().blueprint;
    const gw = bp.components.find(c => c.id === 'api-gateway')!;
    expect(gw.component).toBe('APIManagement.ApiGateway');
    expect(gw.parameters.httpsOnly).toBe(true);
    expect(gw.locked).toContain('httpsOnly');
  });

  it('AWS selection: routes flow into the live CloudFront component', () => {
    const ls = authorFractal()
      .specialize()
      .withRoute({path: '/orders', methods: ['GET']})
      .toLiveSystem({
        name: 'acme-prod',
        environment,
        select: {'api-gateway': AwsCloudFront({region: 'us-east-1'})},
      });

    const gw = ls.components.find(c => c.id === 'api-gateway')!;
    expect(gw.type).toBe('APIManagement.PaaS.AwsCloudFront');
    expect(gw.provider).toBe('AWS');
    const routes = gw.parameters.routes as Route[];
    expect(routes).toContainEqual({path: '/orders', methods: ['GET']});
  });

  it('future-proof + vendor-neutral: Ambassador (CaaS) has no provider', () => {
    const ls = authorFractal()
      .specialize()
      .withRoute({path: '/orders', methods: ['GET']})
      .toLiveSystem({
        name: 'acme-onprem',
        environment,
        select: {'api-gateway': Ambassador({})},
      });

    const gw = ls.components.find(c => c.id === 'api-gateway')!;
    expect(gw.type).toBe('APIManagement.CaaS.Ambassador');
    expect(gw.provider).toBeUndefined();
  });

  it('a missing component selection is a type error AND throws', () => {
    expect(() =>
      authorFractal().toLiveSystem({
        name: 'x',
        environment,
        // @ts-expect-error selection is missing the 'api-gateway' component
        select: {},
      }),
    ).toThrow(/Missing offer selection/);
  });

  describe('AwsCloudFront whole-site redirect', () => {
    function redirectFractal() {
      return createFractal({
        id: 'redirect-sample',
        version: {major: 1, minor: 0, patch: 0},
        boundedContextId,
        blueprint: bp => ({edge: bp.add(ApiGateway({id: 'edge'}))}),
      });
    }
    const liveSystemWith = (offer: ReturnType<typeof AwsCloudFront>) =>
      redirectFractal().toLiveSystem({name: 'redirects', environment, select: {edge: offer}});

    it('carries redirectTo and aliases to the live component as the agent reads them', () => {
      const ls = liveSystemWith(
        AwsCloudFront({
          redirectTo: 'https://fractal.cloud',
          aliases: ['yanchware.com', 'www.yanchware.com'],
        }),
      );

      const edge = ls.components.find(c => c.id === 'edge')!;
      expect(edge.parameters.redirectTo).toBe('https://fractal.cloud');
      expect(edge.parameters.aliases).toEqual(['yanchware.com', 'www.yanchware.com']);
    });

    it.each([
      'http://fractal.cloud',
      'fractal.cloud',
      'https://fractal.cloud?x=1',
      'https://fractal.cloud#top',
      'https://user@fractal.cloud',
      'https://fractal.cloud:8443',
      'https://fractal.cloud:443',
      "https://fractal.cloud/a'b",
      'https://fractal.cloud/a b',
    ])('refuses %s as a redirect target', target => {
      expect(() => liveSystemWith(AwsCloudFront({redirectTo: target}))).toThrow(/redirectTo/);
    });

    it('refuses an alias that is not a host name', () => {
      expect(() =>
        liveSystemWith(
          AwsCloudFront({redirectTo: 'https://fractal.cloud', aliases: ['not a host']}),
        ),
      ).toThrow(/aliases/);
    });

    it('refuses aliases without a redirect, which the agent does not serve yet', () => {
      expect(() => liveSystemWith(AwsCloudFront({aliases: ['cdn.example.com']}))).toThrow(
        /aliases.*redirectTo/,
      );
    });

    it('leaves a CloudFront offer without them as it was', () => {
      const edge = liveSystemWith(AwsCloudFront({})).components.find(c => c.id === 'edge')!;
      expect(edge.parameters.redirectTo).toBeUndefined();
      expect(edge.parameters.aliases).toBeUndefined();
    });
  });
});
