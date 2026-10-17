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

  it('AWS selection: CloudFront refuses the gateway guardrails its agent does not read', () => {
    // The CloudFront agent reads no HTTPS-only switch, rate limit or route list
    // from parameters; sending them would deploy a distribution without them.
    expect(() =>
      authorFractal()
        .specialize()
        .withRoute({path: '/orders', methods: ['GET']})
        .toLiveSystem({
          name: 'acme-prod',
          environment,
          select: {'api-gateway': AwsCloudFront({region: 'us-east-1'})},
        }),
    ).toThrow(
      "Offer APIManagement.PaaS.AwsCloudFront, selected for 'api-gateway', cannot honor withHttpsOnly ('httpsOnly'), a guardrail locked in the Fractal",
    );
  });

  it('future-proof + vendor-neutral: Ambassador (CaaS) has no provider, and takes the custom domain as its host', () => {
    const ls = createFractal({
      id: 'api-management-domain',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({
        gateway: bp.add(
          ApiGateway({id: 'api-gateway'}).withCustomDomain('api.example.com'),
        ),
      }),
    }).toLiveSystem({
      name: 'acme-onprem',
      environment,
      select: {'api-gateway': Ambassador({})},
    });

    const gw = ls.components.find(c => c.id === 'api-gateway')!;
    expect(gw.type).toBe('APIManagement.CaaS.Ambassador');
    expect(gw.provider).toBeUndefined();
    expect(gw.parameters).toEqual({host: 'api.example.com'});
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
      redirectFractal().toLiveSystem({
        name: 'redirects',
        environment,
        select: {edge: offer},
      });

    it('carries redirectTo and aliases to the live component as the agent reads them', () => {
      const ls = liveSystemWith(
        AwsCloudFront({
          redirectTo: 'https://fractal.cloud',
          aliases: ['yanchware.com', 'www.yanchware.com'],
        }),
      );

      const edge = ls.components.find(c => c.id === 'edge')!;
      expect(edge.parameters.redirectTo).toBe('https://fractal.cloud');
      expect(edge.parameters.aliases).toEqual([
        'yanchware.com',
        'www.yanchware.com',
      ]);
    });

    it.each([
      'https://Fractal.Cloud',
      'https://fractal.cloud/',
      'https://fractal.cloud/docs/a%20b',
      ' https://fractal.cloud ',
    ])('accepts %s as a redirect target', target => {
      expect(() =>
        liveSystemWith(AwsCloudFront({redirectTo: target})),
      ).not.toThrow();
    });

    it('accepts aliases in upper case or with a trailing dot', () => {
      expect(() =>
        liveSystemWith(
          AwsCloudFront({
            redirectTo: 'https://fractal.cloud',
            aliases: ['YanchWare.com.', 'www.yanchware.com'],
          }),
        ),
      ).not.toThrow();
    });

    it('reads a blank redirectTo, or no aliases, as nothing to serve', () => {
      expect(() =>
        liveSystemWith(AwsCloudFront({redirectTo: ' ', aliases: []})),
      ).not.toThrow();
    });

    // The checks of this component's own parameters the agent applies too
    // (CloudFrontConfig / CloudFront in fractal-cloud-agents), refused before
    // anything is deployed; the redirect loop the agent would deploy.
    it.each([
      [
        {redirectTo: 'https://fractal.cloud/x', aliases: ['Fractal.Cloud.']},
        "aliases holds the redirect target's own host fractal.cloud, which would redirect to itself forever",
      ],
      [
        {redirectTo: 'https://fractal.cloud', aliases: ['not a host']},
        "aliases holds 'not a host', not a host name",
      ],
      [
        {aliases: ['a.example.com']},
        'aliases need an origin (originDomain, a linked gateway or a linked bucket) or redirectTo to serve',
      ],
      [
        {originDomain: 'bad_host', aliases: ['a.example.com']},
        "originDomain 'bad_host' is not a host name",
      ],
      [
        {originDomain: 'o.example.com', originDomainName: 'bad host'},
        "originDomainName 'bad host' is not a host name",
      ],
      [
        {redirectTo: 'https://fractal.cloud', originDomain: 'o.example.com'},
        'a distribution serves redirectTo or an origin, not both',
      ],
      [
        {originDomain: 'o.example.com', originProtocol: 'ftp'},
        "originProtocol 'ftp' is neither https nor http",
      ],
      [
        {originDomain: 'o.example.com', wafRateLimitPer5Min: 9},
        'wafRateLimitPer5Min 9 is not a whole number from 10 to 2000000000',
      ],
      [
        {originDomain: 'o.example.com', wafRateLimitPer5Min: 2_000_000_001},
        'wafRateLimitPer5Min 2000000001 is not a whole number from 10 to 2000000000',
      ],
      [
        {originDomain: 'o.example.com', originReadTimeoutSeconds: 0},
        'originReadTimeoutSeconds 0 is not a whole number of seconds from 1 to 180',
      ],
      [
        {originDomain: 'o.example.com', originKeepaliveTimeoutSeconds: 181},
        'originKeepaliveTimeoutSeconds 181 is not a whole number of seconds from 1 to 180',
      ],
      [
        {originDomain: 'o.example.com', originReadTimeoutSeconds: 1.5},
        'originReadTimeoutSeconds 1.5 is not a whole number of seconds from 1 to 180',
      ],
    ])('refuses %o', (config, message) => {
      expect(() =>
        liveSystemWith(
          AwsCloudFront(config as Parameters<typeof AwsCloudFront>[0]),
        ),
      ).toThrow(`Live component 'edge': ${message}.`);
    });

    it('accepts what the agent accepts at the bounds', () => {
      expect(() =>
        liveSystemWith(
          AwsCloudFront({
            originDomain: 'O.Example.com',
            aliases: ['a.example.com'],
            originProtocol: 'HTTP' as 'http',
            wafRateLimitPer5Min: 10,
            originReadTimeoutSeconds: 180,
            originKeepaliveTimeoutSeconds: 1,
          }),
        ),
      ).not.toThrow();
    });

    it('leaves a CloudFront offer without them as it was', () => {
      const edge = liveSystemWith(AwsCloudFront({})).components.find(
        c => c.id === 'edge',
      )!;
      expect(edge.parameters.redirectTo).toBeUndefined();
      expect(edge.parameters.aliases).toBeUndefined();
    });
  });
});
