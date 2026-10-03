/**
 * gateway_routes.test.ts — executable spec for the Traefik offer and the
 * Workload → gateway route link.
 *
 * The route link is OUTBOUND on the workload (the workload's agent creates the
 * IngressRoute, middlewares and ServersTransport in the workload's namespace),
 * so it works when the gateway is a reference to the platform's Traefik. Its
 * settings are flat, indexed strings: `routes.<n>.prefix`, `routes.<n>.rewritePath`,
 * `routes.<n>.host`, `responseTimeoutMs`, `idleConnTimeoutMs`, `retryAttempts`,
 * `servicePort`.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {ApiGateway} from './components/api_management';
import {Workload} from './components/custom_workloads';
import {gatewayRouteSettings} from './components/gateway_route_settings';
import {Traefik, TraefikGateway} from './offers/api_management';
import {K8sWorkload} from './offers/custom_workloads';
import {referenceTo} from './reference';

const OWNER = '00000000-0000-0000-0000-0000000000cc';
const environment = {ownerType: 'Organizational', ownerId: OWNER, name: 'prod'};
const boundedContextId = {
  ownerType: 'Organizational',
  ownerId: OWNER,
  name: 'accounts',
};

describe('gatewayRouteSettings', () => {
  it('flattens routes into indexed string settings', () => {
    expect(
      gatewayRouteSettings({
        routes: [
          {prefix: '/accounts'},
          {
            prefix: '/swagger/accounts',
            rewritePath: '/swagger/v1.0/swagger.json',
          },
          {prefix: '/members', host: 'internal.fractal.cloud'},
        ],
        responseTimeoutMs: 10000,
        idleConnTimeoutMs: 10000,
        retryAttempts: 2,
        servicePort: 8080,
      }),
    ).toEqual({
      'routes.0.prefix': '/accounts',
      'routes.1.prefix': '/swagger/accounts',
      'routes.1.rewritePath': '/swagger/v1.0/swagger.json',
      'routes.2.prefix': '/members',
      'routes.2.host': 'internal.fractal.cloud',
      responseTimeoutMs: '10000',
      idleConnTimeoutMs: '10000',
      retryAttempts: '2',
      servicePort: '8080',
    });
  });

  it('leaves out what is not set, so the agent applies its defaults', () => {
    expect(gatewayRouteSettings({routes: [{prefix: '/x'}]})).toEqual({
      'routes.0.prefix': '/x',
    });
  });

  it('sends retryAttempts 0 (no retries) rather than dropping it', () => {
    expect(
      gatewayRouteSettings({routes: [{prefix: '/x'}], retryAttempts: 0}),
    ).toMatchObject({retryAttempts: '0'});
  });

  it.each([
    ['no routes', {routes: []}, /at least one route/],
    [
      'a prefix without a leading slash',
      {routes: [{prefix: 'x'}]},
      /prefix 'x'/,
    ],
    ['a prefix with a space', {routes: [{prefix: '/a b'}]}, /prefix '\/a b'/],
    [
      'a rewritePath without a leading slash',
      {routes: [{prefix: '/x', rewritePath: 'y'}]},
      /rewritePath 'y'/,
    ],
    [
      'a host that is not a host name',
      {routes: [{prefix: '/x', host: 'a_b'}]},
      /host 'a_b'/,
    ],
    [
      'a negative timeout',
      {routes: [{prefix: '/x'}], responseTimeoutMs: -1},
      /responseTimeoutMs/,
    ],
    [
      'a zero idle timeout',
      {routes: [{prefix: '/x'}], idleConnTimeoutMs: 0},
      /idleConnTimeoutMs/,
    ],
    [
      'a fractional retry count',
      {routes: [{prefix: '/x'}], retryAttempts: 1.5},
      /retryAttempts/,
    ],
    [
      'a port out of range',
      {routes: [{prefix: '/x'}], servicePort: 70000},
      /servicePort/,
    ],
    [
      'the same prefix and host twice',
      {routes: [{prefix: '/x'}, {prefix: '/x'}]},
      /'\/x' twice/,
    ],
  ])('refuses %s', (_why, options, reason) => {
    expect(() => gatewayRouteSettings(options)).toThrow(reason);
  });
});

describe('Workload → Traefik route link across Live Systems', () => {
  const fractal = () =>
    createFractal({
      id: 'routed-service',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const gateway = bp.add(ApiGateway({id: 'gateway'}));
        const service = bp.add(Workload({id: 'service'}));
        bp.link(
          service,
          gateway,
          gatewayRouteSettings({
            routes: [{prefix: '/accounts'}],
            responseTimeoutMs: 60000,
          }),
        );
        return {gateway, service};
      },
    });

  it('links the workload to the referenced gateway by its local id', () => {
    const ls = fractal().toLiveSystem({
      name: 'accounts',
      environment,
      select: {
        gateway: referenceTo(TraefikGateway, {
          liveSystemId: `Organizational/${OWNER}/platform/shared-platform`,
          componentId: 'traefik',
        }),
        service: K8sWorkload({namespace: 'fractal'}),
      },
    });
    const gateway = ls.components.find(c => c.id === 'gateway')!;
    const service = ls.components.find(c => c.id === 'service')!;
    expect(gateway.type).toBe('APIManagement.CaaS.TraefikGateway');
    expect(gateway.provider).toBeUndefined();
    expect(service.links).toEqual([
      {
        componentId: 'gateway',
        settings: {'routes.0.prefix': '/accounts', responseTimeoutMs: '60000'},
      },
    ]);
  });
});

describe('TraefikGateway offer (caas-k8s)', () => {
  it('emits the Traefik knobs under the agent keys', () => {
    const ls = createFractal({
      id: 'platform-gateway',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({gateway: bp.add(ApiGateway({id: 'traefik'}))}),
    }).toLiveSystem({
      name: 'platform',
      environment,
      select: {
        traefik: TraefikGateway({
          namespace: 'traefik',
          replicas: 2,
          chartVersion: '37.1.1',
          host: 'api.fractal.cloud',
          internalLoadBalancer: true,
          tlsCertificateArn:
            'arn:aws:acm:eu-central-1:123456789012:certificate/abc',
          entryPointIdleTimeoutSeconds: 75,
        }),
      },
    });
    expect(ls.components[0]).toMatchObject({
      type: 'APIManagement.CaaS.TraefikGateway',
      deliveryModel: 'CaaS',
      parameters: {
        namespace: 'traefik',
        replicas: 2,
        chartVersion: '37.1.1',
        host: 'api.fractal.cloud',
        internalLoadBalancer: true,
        tlsCertificateArn:
          'arn:aws:acm:eu-central-1:123456789012:certificate/abc',
        entryPointIdleTimeoutSeconds: 75,
      },
    });
  });

  it.each([
    ['a host that is not a host name', {host: 'not a host'}, /host/],
    ['zero replicas', {replicas: 0}, /replicas/],
    [
      'a non-ACM certificate',
      {tlsCertificateArn: 'arn:aws:iam::1:server-certificate/x'},
      /tlsCertificateArn/,
    ],
    [
      'a zero idle timeout',
      {entryPointIdleTimeoutSeconds: 0},
      /entryPointIdleTimeoutSeconds/,
    ],
  ])('refuses %s', (_why, config, reason) => {
    expect(() =>
      createFractal({
        id: 'platform-gateway',
        version: {major: 1, minor: 0, patch: 0},
        boundedContextId,
        blueprint: bp => ({gateway: bp.add(ApiGateway({id: 'traefik'}))}),
      }).toLiveSystem({
        name: 'platform',
        environment,
        select: {traefik: TraefikGateway(config)},
      }),
    ).toThrow(reason);
  });
});

describe('Traefik offer (Java agents)', () => {
  it('keeps the shape the Java agents reconcile', () => {
    const ls = createFractal({
      id: 'java-traefik',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({gateway: bp.add(ApiGateway({id: 'traefik'}))}),
    }).toLiveSystem({
      name: 'platform',
      environment,
      select: {traefik: Traefik({namespace: 'ingress'})},
    });
    expect(ls.components[0]).toMatchObject({
      type: 'APIManagement.CaaS.Traefik',
      parameters: {namespace: 'ingress'},
    });
  });
});
