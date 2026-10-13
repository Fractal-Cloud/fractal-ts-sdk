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
import {ContainerPlatform} from './components/network_and_compute';
import {gatewayRouteSettings} from './components/gateway_route_settings';
import {AwsCloudFront, Traefik, TraefikGateway} from './offers/api_management';
import {K8sWorkload} from './offers/custom_workloads';
import {Eks} from './offers/network_and_compute';
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
        const cluster = bp.add(ContainerPlatform({id: 'cluster'}));
        const service = bp.add(Workload({id: 'service'}).dependsOn(cluster));
        bp.link(
          service,
          gateway,
          gatewayRouteSettings({
            routes: [{prefix: '/accounts'}],
            responseTimeoutMs: 60000,
          }),
        );
        return {gateway, cluster, service};
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
        cluster: referenceTo(Eks, {
          liveSystemId: `Organizational/${OWNER}/platform/shared-platform`,
          componentId: 'eks',
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
      blueprint: bp => {
        const cluster = ContainerPlatform({id: 'cluster'});
        const gateway = bp.add(ApiGateway({id: 'traefik'}).dependsOn(cluster));
        return {gateway, cluster: bp.add(cluster)};
      },
    }).toLiveSystem({
      name: 'platform',
      environment,
      select: {
        cluster: Eks({}),
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
});

describe('Traefik offer (Java agents)', () => {
  it('keeps the shape the Java agents reconcile', () => {
    const ls = createFractal({
      id: 'java-traefik',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const cluster = ContainerPlatform({id: 'cluster'});
        const gateway = bp.add(ApiGateway({id: 'traefik'}).dependsOn(cluster));
        return {gateway, cluster: bp.add(cluster)};
      },
    }).toLiveSystem({
      name: 'platform',
      environment,
      select: {cluster: Eks({}), traefik: Traefik({namespace: 'ingress'})},
    });
    expect(ls.components[0]).toMatchObject({
      type: 'APIManagement.CaaS.Traefik',
      parameters: {namespace: 'ingress'},
    });
  });
});

describe('repeated route declarations to one gateway', () => {
  const OWNER_LS = `Organizational/${OWNER}/platform/shared-platform`;
  const routed = () =>
    createFractal({
      id: 'routed-service',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const gateway = bp.add(ApiGateway({id: 'gateway'}));
        const cluster = bp.add(ContainerPlatform({id: 'cluster'}));
        const service = bp.add(Workload({id: 'service'}).dependsOn(cluster));
        bp.link(
          service,
          gateway,
          gatewayRouteSettings({
            routes: [{prefix: '/accounts'}],
            retryAttempts: 2,
          }),
        );
        return {gateway, cluster, service};
      },
      operations: (s, ctx) => ({
        withRoute: (options: Parameters<typeof gatewayRouteSettings>[0]) =>
          ctx.link(s.service, s.gateway, gatewayRouteSettings(options)),
      }),
    });
  const select = {
    gateway: referenceTo(TraefikGateway, {
      liveSystemId: OWNER_LS,
      componentId: 'traefik',
    }),
    cluster: referenceTo(Eks, {liveSystemId: OWNER_LS, componentId: 'eks'}),
    service: K8sWorkload({}),
  };

  it('merge into ONE link, appending the routes', () => {
    const service = routed()
      .specialize()
      .withRoute({
        routes: [
          {prefix: '/members'},
          {
            prefix: '/swagger/accounts',
            rewritePath: '/swagger/v1.0/swagger.json',
          },
        ],
      })
      .withRoute({
        routes: [{prefix: '/site', host: 'fractal.cloud'}],
        retryAttempts: 2,
      })
      .toLiveSystem({name: 'accounts', environment, select})
      .components.find(c => c.id === 'service')!;
    expect(service.links).toEqual([
      {
        componentId: 'gateway',
        settings: {
          'routes.0.prefix': '/accounts',
          'routes.1.prefix': '/members',
          'routes.2.prefix': '/swagger/accounts',
          'routes.2.rewritePath': '/swagger/v1.0/swagger.json',
          'routes.3.prefix': '/site',
          'routes.3.host': 'fractal.cloud',
          retryAttempts: '2',
        },
      },
    ]);
  });

  it('refuses a merge whose timeouts or retries contradict the link so far', () => {
    expect(() =>
      routed()
        .specialize()
        .withRoute({routes: [{prefix: '/members'}], retryAttempts: 0}),
    ).toThrow(/retryAttempts '0' contradicts '2'/);
  });

  it('refuses a merge that adds a timeout the earlier routes did not ask for', () => {
    expect(() =>
      routed()
        .specialize()
        .withRoute({routes: [{prefix: '/members'}], responseTimeoutMs: 10000}),
    ).toThrow(
      /responseTimeoutMs would also apply to the routes declared before/,
    );
  });

  it('treats host names case-insensitively when spotting a repeated route', () => {
    expect(() =>
      routed()
        .specialize()
        .withRoute({
          routes: [{prefix: '/a', host: 'Fractal.Cloud'}],
          retryAttempts: 2,
        })
        .withRoute({
          routes: [{prefix: '/a', host: 'fractal.cloud'}],
          retryAttempts: 2,
        }),
    ).toThrow(/'\/a' twice/);
  });

  it('refuses a merge that routes the same prefix and host again', () => {
    expect(() =>
      routed()
        .specialize()
        .withRoute({routes: [{prefix: '/accounts'}]}),
    ).toThrow(/'\/accounts' twice/);
  });
});

describe('TraefikGateway ForwardAuth (ocelot)', () => {
  const gatewayWith = (config: Parameters<typeof TraefikGateway>[0]) =>
    createFractal({
      id: 'platform-gateway',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const cluster = ContainerPlatform({id: 'cluster'});
        const gateway = bp.add(ApiGateway({id: 'traefik'}).dependsOn(cluster));
        return {gateway, cluster: bp.add(cluster)};
      },
    }).toLiveSystem({
      name: 'platform',
      environment,
      select: {cluster: Eks({}), traefik: TraefikGateway(config)},
    }).components[0];

  it('sends the ForwardAuth knobs, lists comma-separated', () => {
    expect(
      gatewayWith({
        forwardAuthAddress: 'http://ocelot.security.svc:8080/auth',
        forwardAuthRequestHeaders: ['x-clientid', 'x-clientsecret', 'origin'],
        forwardAuthResponseHeaders: ['x-jwt'],
        forwardAuthForwardBody: true,
        forwardAuthMaxBodySize: 1048576,
      }).parameters,
    ).toEqual({
      forwardAuthAddress: 'http://ocelot.security.svc:8080/auth',
      forwardAuthRequestHeaders: 'x-clientid,x-clientsecret,origin',
      forwardAuthResponseHeaders: 'x-jwt',
      forwardAuthForwardBody: true,
      forwardAuthMaxBodySize: 1048576,
    });
  });
});

describe('TraefikGateway behind a CloudFront VPC origin', () => {
  it('refuses a TLS listener, which a VPC origin cannot reach', () => {
    const f = createFractal({
      id: 'edge',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const cluster = bp.add(ContainerPlatform({id: 'cluster'}));
        const gateway = bp.add(ApiGateway({id: 'traefik'}).dependsOn(cluster));
        const cdn = bp.add(ApiGateway({id: 'cdn'}));
        bp.link(cdn, gateway);
        return {cluster, gateway, cdn};
      },
    });
    expect(() =>
      f.toLiveSystem({
        name: 'platform',
        environment,
        select: {
          cluster: Eks({}),
          traefik: TraefikGateway({
            tlsCertificateArn:
              'arn:aws:acm:eu-central-1:123456789012:certificate/abc',
          }),
          cdn: AwsCloudFront({aliases: ['api.fractal.cloud']}),
        },
      }),
    ).toThrow(/VPC origin.*TCP-only.*tlsCertificateArn/);
  });
});
