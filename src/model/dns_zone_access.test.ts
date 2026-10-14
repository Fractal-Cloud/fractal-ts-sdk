/**
 * dns_zone_access.test.ts — components asking for access to environment DNS
 * zones (`dnsZones`), and the TLS gateway that issues its own certificate
 * through such a grant (`acmeEmail`, `acmeServer`).
 *
 * `dnsZones` is read by the control plane, which grants the component's own
 * identity access to the zone, cut down to the zone's `componentAccess`
 * ceiling. It is an open default on the component: the zones depend on the
 * environment a Live System runs in, not on the design.
 */
import {describe, expect, it} from 'vitest';
import {createFractal, type LiveSystemComponent} from './core';
import {ApiGateway} from './components/api_management';
import {Workload} from './components/custom_workloads';
import {EmailSender} from './components/messaging';
import type {DnsZoneAccessRequest} from './components/dns_zone_access_request';
import {AwsCloudFront, TraefikGateway} from './offers/api_management';
import {K8sWorkload} from './offers/custom_workloads';
import {AwsSesIdentity} from './offers/messaging';

const environment = {};
const boundedContextId = {name: 'platform'};
const version = {major: 1, minor: 0, patch: 0};
const TXT_WRITE: DnsZoneAccessRequest[] = [
  {name: 'example.com', access: {TXT: 'write'}},
];

/** `text` as a literal inside a regular expression. */
const escape = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const only = (
  components: readonly LiveSystemComponent[],
  id: string,
): LiveSystemComponent => {
  const found = components.find(c => c.id === id);
  if (found === undefined) {
    throw new Error(`no component ${id}`);
  }
  return found;
};

const gatewaySystem = (zones: DnsZoneAccessRequest[] | undefined) =>
  createFractal({
    id: 'platform-gateway',
    version,
    boundedContextId,
    blueprint: bp => {
      const gateway = ApiGateway({id: 'gateway'});
      return {
        gateway: bp.add(
          zones === undefined ? gateway : gateway.withDnsZones(zones),
        ),
      };
    },
    operations: slots => ({
      useZones: (z: DnsZoneAccessRequest[]) => slots.gateway.set('dnsZones', z),
    }),
  });

describe('a component asking for access to environment DNS zones', () => {
  it('reaches the TraefikGateway agent as the dnsZones parameter', () => {
    const gateway = only(
      gatewaySystem(TXT_WRITE).toLiveSystem({
        name: 'platform',
        environment,
        select: {gateway: TraefikGateway({host: 'api.example.com'})},
      }).components,
      'gateway',
    );
    expect(gateway.parameters).toEqual({
      dnsZones: TXT_WRITE,
      host: 'api.example.com',
    });
  });

  it('is an open default: an operation may change the zones', () => {
    const other: DnsZoneAccessRequest[] = [
      {name: 'example.org', access: {'*': 'read', TXT: 'write'}},
    ];
    const gateway = only(
      gatewaySystem(TXT_WRITE)
        .specialize()
        .useZones(other)
        .toLiveSystem({
          name: 'platform',
          environment,
          select: {gateway: TraefikGateway({})},
        }).components,
      'gateway',
    );
    expect(gateway.parameters.dnsZones).toEqual(other);
  });

  it('stays in the blueprint as a parameter, not as a guardrail', () => {
    const [gateway] = gatewaySystem(TXT_WRITE).blueprint.components;
    expect(gateway.parameters).toEqual({dnsZones: TXT_WRITE});
    expect(gateway.locked).toEqual([]);
  });

  it('reaches the caas-k8s workload agent as the dnsZones parameter', () => {
    const access: DnsZoneAccessRequest[] = [
      {name: 'example.com', access: {'*': 'write', MX: 'none'}},
    ];
    const workload = only(
      createFractal({
        id: 'app',
        version,
        boundedContextId,
        blueprint: bp => ({
          app: bp.add(
            Workload({id: 'app'})
              .withImage('registry/app:1')
              .withDnsZones(access),
          ),
        }),
      }).toLiveSystem({
        name: 'app',
        environment,
        select: {app: K8sWorkload({})},
      }).components,
      'app',
    );
    expect(workload.parameters).toEqual({
      containerImage: 'registry/app:1',
      dnsZones: access,
    });
  });

  it('is refused as a K8sWorkload config key, naming withDnsZones', () => {
    const build = () =>
      createFractal({
        id: 'app',
        version,
        boundedContextId,
        blueprint: bp => ({
          app: bp.add(Workload({id: 'app'}).withImage('registry/app:1')),
        }),
      }).toLiveSystem({
        name: 'app',
        environment,
        select: {
          // A JavaScript caller, unchecked by the compiler.
          app: K8sWorkload({
            dnsZones: [{name: 'example.com', access: {TXT: 'write'}}],
          } as Parameters<typeof K8sWorkload>[0]),
        },
      });
    expect(build).toThrow(
      "Live component 'app': dnsZones is not a K8sWorkload config key: " +
        "declare it on the Workload component, Workload({id: 'app'}).withDnsZones([...])",
    );
  });

  it('is refused by an offer whose agent takes no DNS zone access', () => {
    expect(() =>
      gatewaySystem(TXT_WRITE).toLiveSystem({
        name: 'platform',
        environment,
        select: {gateway: AwsCloudFront({})},
      }),
    ).toThrow(
      "Offer APIManagement.PaaS.AwsCloudFront, selected for 'gateway', cannot honor withDnsZones ('dnsZones'), a parameter open in the Fractal",
    );
  });

  it('is refused on the SES identity until its agent writes records through a grant', () => {
    expect(() =>
      createFractal({
        id: 'mail',
        version,
        boundedContextId,
        blueprint: bp => ({
          mail: bp.add(
            EmailSender({id: 'mail'}).withDnsZones([
              {
                name: 'example.com',
                access: {CNAME: 'write', MX: 'write', TXT: 'write'},
              },
            ]),
          ),
        }),
      }).toLiveSystem({
        name: 'mail',
        environment,
        select: {mail: AwsSesIdentity({domain: 'example.com'})},
      }),
    ).toThrow(
      "Offer Messaging.PaaS.AwsSesIdentity, selected for 'mail', cannot honor withDnsZones ('dnsZones'), a parameter open in the Fractal",
    );
  });

  it.each([
    [
      [
        {name: 'example.com', access: {TXT: 'write'}},
        {name: 'Example.com.', access: {MX: 'write'}},
      ],
      "names the zone 'example.com' twice; give one entry per zone",
    ],
    [[{name: ' ', access: {TXT: 'write'}}], 'names no zone'],
    [
      [{name: 'example.com', access: {NS: 'write'}}],
      "access of 'example.com': 'NS' is not a record type access can be granted on",
    ],
    [
      [{name: 'example.com', access: {TXT: 'admin'}}],
      `access of 'example.com': "admin" is not an access level (set for 'TXT')`,
    ],
    [
      [{name: 'example.com', access: {txt: 'write', TXT: 'none'}}],
      "access of 'example.com': names 'TXT' more than once",
    ],
    [{name: 'example.com'}, 'is not a list of {name, access} entries'],
  ])('refuses dnsZones %j', (zones, reason) => {
    expect(() =>
      ApiGateway({id: 'gateway'}).withDnsZones(
        zones as unknown as DnsZoneAccessRequest[],
      ),
    ).toThrow(new RegExp(`^withDnsZones: .*${escape(reason)}`));
  });

  it('accepts levels and types in any case, as the control plane reads them', () => {
    expect(() =>
      Workload({id: 'app'}).withDnsZones([
        {
          name: 'example.com',
          access: {txt: ' Write'} as unknown as DnsZoneAccessRequest['access'],
        },
      ]),
    ).not.toThrow();
  });

  it('accepts a per-type read in a request: the control plane reads it as whole-zone read', () => {
    expect(() =>
      EmailSender({id: 'mail'}).withDnsZones([
        {name: 'example.com', access: {TXT: 'read'}},
      ]),
    ).not.toThrow();
  });
});

describe('TraefikGateway issuing its own certificate', () => {
  const edge = (
    zones: DnsZoneAccessRequest[] | undefined,
    gateway: Parameters<typeof TraefikGateway>[0],
  ) =>
    createFractal({
      id: 'platform-edge',
      version,
      boundedContextId,
      blueprint: bp => {
        const plain = ApiGateway({id: 'traefik'});
        const traefik = bp.add(
          zones === undefined ? plain : plain.withDnsZones(zones),
        );
        const cdn = bp.add(ApiGateway({id: 'cdn'}));
        bp.link(cdn, traefik);
        return {traefik, cdn};
      },
    }).toLiveSystem({
      name: 'platform',
      environment,
      select: {
        traefik: TraefikGateway(gateway),
        cdn: AwsCloudFront({
          aliases: ['api.example.com'],
          originProtocol: 'https',
        }),
      },
    });

  it('carries acmeEmail and acmeServer', () => {
    const traefik = only(
      edge(TXT_WRITE, {
        host: 'api.example.com',
        acmeEmail: 'platform@example.com',
        acmeServer: 'staging',
      }).components,
      'traefik',
    );
    expect(traefik.parameters).toEqual({
      dnsZones: TXT_WRITE,
      host: 'api.example.com',
      acmeEmail: 'platform@example.com',
      acmeServer: 'staging',
    });
  });

  it('accepts an https ACME directory URL', () => {
    expect(
      only(
        edge(TXT_WRITE, {
          host: 'api.example.com',
          acmeServer: 'https://acme.example.net/directory',
        }).components,
        'traefik',
      ).parameters.acmeServer,
    ).toBe('https://acme.example.net/directory');
  });

  it('terminates TLS for CloudFront when its zone grant lets it write TXT records', () => {
    expect(() =>
      edge([{name: 'example.com', access: {'*': 'write'}}], {
        host: 'api.example.com',
      }),
    ).not.toThrow();
  });

  it('does not terminate TLS without TXT write on the zone of its host', () => {
    for (const zones of [
      [{name: 'example.com', access: {'*': 'read'}}],
      [{name: 'example.com', access: {'*': 'write', TXT: 'none'}}],
      [{name: 'example.org', access: {TXT: 'write'}}],
    ] as DnsZoneAccessRequest[][]) {
      expect(() => edge(zones, {host: 'api.example.com'})).toThrow(
        "CloudFront reaches gateway 'traefik' over https, but it does not terminate TLS",
      );
    }
  });

  it('a certificate host is covered by the longest zone that contains it', () => {
    expect(() =>
      edge(
        [
          {name: 'example.com', access: {TXT: 'write'}},
          {name: 'api.example.com', access: {'*': 'read'}},
        ],
        {host: 'api.example.com'},
      ),
    ).toThrow('does not terminate TLS');
    expect(() =>
      edge([{name: 'example.com', access: {TXT: 'write'}}], {
        host: 'api.example.com',
        tlsHosts: ['*.example.com'],
      }),
    ).not.toThrow();
  });

  it('refuses tlsHosts without TXT write on the zone of a host, as the agent does', () => {
    expect(() =>
      edge([{name: 'example.org', access: {TXT: 'write'}}], {
        host: 'api.example.com',
        tlsHosts: ['api.example.com'],
      }),
    ).toThrow(
      "Live component 'traefik': tlsHosts is set, but the gateway has no certificate",
    );
    expect(() =>
      edge([{name: 'example.com', access: {TXT: 'write'}}], {
        host: 'api.example.com',
        tlsHosts: ['api.example.com'],
      }),
    ).not.toThrow();
  });

  it('serves an operator Secret instead of issuing, whatever its zones', () => {
    expect(() =>
      edge([{name: 'example.org', access: {'*': 'read'}}], {
        host: 'api.example.com',
        tlsSecretName: 'api-tls',
      }),
    ).not.toThrow();
  });
});
