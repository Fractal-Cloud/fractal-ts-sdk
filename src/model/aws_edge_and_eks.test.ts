/**
 * aws_edge_and_eks.test.ts — executable spec for the shared-platform knobs of
 * the EKS and CloudFront offers:
 *   - `Eks`: EKS Auto Mode node pools (Graviton families, capacity types),
 *     control-plane log types; the neutral `kubernetesVersion` still flows;
 *   - `AwsCloudFront`: a custom origin (`originDomain`) or a VPC origin to the
 *     internal NLB of a LINKED Traefik, `aliases` for either, `originProtocol`,
 *     a WAF rate limit, and a regional certificate for the origin host name.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {ApiGateway} from './components/api_management';
import {ContainerPlatform} from './components/network_and_compute';
import {AwsCloudFront, Traefik, TraefikGateway} from './offers/api_management';
import {Eks} from './offers/network_and_compute';

const environment = {};
const boundedContextId = {name: 'platform'};

describe('Eks — Auto Mode node pools', () => {
  const cluster = (locked = false) =>
    createFractal({
      id: 'platform-cluster',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const base = ContainerPlatform({id: 'eks'}).withKubernetesVersion(
          '1.33',
        );
        return {
          eks: bp.add(locked ? base.withNodePools([{name: 'general'}]) : base),
        };
      },
    });

  it('emits node pools, log types and the neutral Kubernetes version', () => {
    const eks = cluster()
      .toLiveSystem({
        name: 'platform',
        environment,
        select: {
          eks: Eks({
            nodePools: [
              {
                name: 'graviton',
                architectures: ['arm64'],
                instanceFamilies: ['m7g'],
                capacityTypes: ['on-demand'],
                instanceSizes: ['large', 'xlarge'],
              },
            ],
            controlPlaneLogTypes: ['api', 'authenticator'],
          }),
        },
      })
      .components.find(c => c.id === 'eks')!;
    expect(eks.parameters).toEqual({
      kubernetesVersion: '1.33',
      nodePools: [
        {
          name: 'graviton',
          architectures: ['arm64'],
          instanceFamilies: ['m7g'],
          capacityTypes: ['on-demand'],
          instanceSizes: ['large', 'xlarge'],
        },
      ],
      controlPlaneLogTypes: ['api', 'authenticator'],
    });
  });

  it('emits no controlPlaneLogTypes when unset, so the agent leaves cluster logging alone', () => {
    const eks = cluster()
      .toLiveSystem({name: 'platform', environment, select: {eks: Eks({})}})
      .components.find(c => c.id === 'eks')!;
    expect(eks.parameters).not.toHaveProperty('controlPlaneLogTypes');
  });

  it('passes an explicit empty controlPlaneLogTypes, which turns logging off', () => {
    const eks = cluster()
      .toLiveSystem({
        name: 'platform',
        environment,
        select: {eks: Eks({controlPlaneLogTypes: []})},
      })
      .components.find(c => c.id === 'eks')!;
    expect(eks.parameters.controlPlaneLogTypes).toEqual([]);
  });

  it('refuses offer node pools that would replace LOCKED neutral node pools', () => {
    expect(() =>
      cluster(true).toLiveSystem({
        name: 'platform',
        environment,
        select: {eks: Eks({nodePools: [{name: 'graviton'}]})},
      }),
    ).toThrow(/'nodePools' on 'eks' is a locked guardrail/);
  });
});

describe('AwsCloudFront — edge in front of the platform gateway', () => {
  const edge = (link = true) =>
    createFractal({
      id: 'platform-edge',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const gateway = bp.add(ApiGateway({id: 'traefik'}));
        const cdn = bp.add(ApiGateway({id: 'cdn'}));
        if (link) {
          bp.link(cdn, gateway);
        }
        return {gateway, cdn};
      },
    });

  it('serves aliases from a VPC origin to the linked TraefikGateway', () => {
    const ls = edge().toLiveSystem({
      name: 'platform',
      environment,
      select: {
        traefik: TraefikGateway({
          internalLoadBalancer: true,
          host: 'api.fractal.cloud',
          tlsClusterIssuer: 'letsencrypt',
        }),
        cdn: AwsCloudFront({
          aliases: ['api.fractal.cloud'],
          originProtocol: 'https',
          originReadTimeoutSeconds: 60,
          originKeepaliveTimeoutSeconds: 60,
          wafEnabled: true,
          wafRateLimitPer5Min: 2000,
          originDomainName: 'origin.api.fractal.cloud',
        }),
      },
    });
    const cdn = ls.components.find(c => c.id === 'cdn')!;
    expect(cdn.links).toEqual([{componentId: 'traefik', settings: {}}]);
    expect(cdn.parameters).toEqual({
      aliases: ['api.fractal.cloud'],
      originProtocol: 'https',
      originReadTimeoutSeconds: 60,
      originKeepaliveTimeoutSeconds: 60,
      wafEnabled: true,
      wafRateLimitPer5Min: 2000,
      originDomainName: 'origin.api.fractal.cloud',
    });
  });

  it("accepts the Java agents' Traefik as the VPC origin too", () => {
    expect(() =>
      edge().toLiveSystem({
        name: 'platform',
        environment,
        select: {
          traefik: Traefik({}),
          cdn: AwsCloudFront({aliases: ['api.fractal.cloud']}),
        },
      }),
    ).not.toThrow();
  });

  it('refuses links to two gateways', () => {
    const f = createFractal({
      id: 'two-gateways',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const a = bp.add(ApiGateway({id: 'a'}));
        const b = bp.add(ApiGateway({id: 'b'}));
        const cdn = bp.add(ApiGateway({id: 'cdn'}));
        bp.link(cdn, a);
        bp.link(cdn, b);
        return {a, b, cdn};
      },
    });
    expect(() =>
      f.toLiveSystem({
        name: 'platform',
        environment,
        select: {
          a: TraefikGateway({}),
          b: TraefikGateway({}),
          cdn: AwsCloudFront({aliases: ['api.fractal.cloud']}),
        },
      }),
    ).toThrow(/links to 2 gateways \[a, b\]: at most one/);
  });

  it('serves aliases from a custom origin', () => {
    const ls = edge(false).toLiveSystem({
      name: 'platform',
      environment,
      select: {
        traefik: Traefik({}),
        cdn: AwsCloudFront({
          originDomain: 'origin.example.com',
          aliases: ['www.example.com'],
        }),
      },
    });
    expect(ls.components.find(c => c.id === 'cdn')!.parameters).toEqual({
      originDomain: 'origin.example.com',
      aliases: ['www.example.com'],
    });
  });

  it.each([
    [
      'a redirect together with a VPC origin',
      {redirectTo: 'https://x.example.com'},
      true,
      /redirectTo or an origin, not both/,
    ],
    [
      'a custom origin together with a VPC origin',
      {originDomain: 'o.example.com'},
      true,
      /originDomain or a linked gateway, not both/,
    ],
  ])('refuses %s', (_why, config, link, reason) => {
    expect(() =>
      edge(link).toLiveSystem({
        name: 'platform',
        environment,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        select: {
          traefik: TraefikGateway({}),
          cdn: AwsCloudFront(config as any),
        },
      }),
    ).toThrow(reason);
  });

  it('still serves the whole-site redirect with aliases', () => {
    expect(() =>
      edge(false).toLiveSystem({
        name: 'platform',
        environment,
        select: {
          traefik: Traefik({}),
          cdn: AwsCloudFront({
            redirectTo: 'https://fractal.cloud',
            aliases: ['www.fractal.cloud'],
          }),
        },
      }),
    ).not.toThrow();
  });
});
