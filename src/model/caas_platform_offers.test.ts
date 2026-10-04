/**
 * caas_platform_offers.test.ts — the caas-k8s platform offers:
 *   - `CertManager` (Security.CaaS.CertManager) on the new `CertificateManager` component;
 *   - `SqsExporter` (Observability.CaaS.SqsExporter) and its queue links;
 *   - the Traefik-terminated TLS and ForwardAuth exemption keys of `TraefikGateway`;
 *   - the parameters and links of the Grafana stack offers (kube-prometheus-stack,
 *     Loki, Tempo, Alloy).
 *
 * Every key is the one the caas-k8s agent declares in the offer's catalog `Config`:
 * an undeclared key is pruned by the platform before the agent sees it.
 */
import {describe, it, expect} from 'vitest';
import {
  addDependency,
  createFractal,
  type ComponentNode,
  type LiveSystemComponent,
} from './core';
import {ApiGateway} from './components/api_management';
import {CertificateManager} from './components/certificate_manager';
import {MessagingEntity} from './components/messaging';
import {Logging, Monitoring, Tracing} from './components/observability';
import {ObjectStorage} from './components/storage';
import {AwsCloudFront, TraefikGateway} from './offers/api_management';
import {AwsSqsQueue} from './offers/messaging';
import {
  GrafanaAlloy,
  GrafanaLoki,
  GrafanaTempo,
  KubePrometheusStack,
  SqsExporter,
} from './offers/observability';
import {CertManager} from './offers/security';
import {AwsS3} from './offers/storage';
import {liveSystemIdOf, referenceTo} from './reference';

const environment = {};
const boundedContextId = {name: 'platform'};
const version = {major: 1, minor: 0, patch: 0};
const PLATFORM = {
  ownerType: 'Organizational',
  ownerId: '00000000-0000-0000-0000-0000000000aa',
  name: 'platform',
};

const dependingOn = <Id extends string, C extends string>(
  node: ComponentNode<Id, C>,
  ...others: readonly ComponentNode[]
): ComponentNode<Id, C> => ({
  state: others.reduce((s, o) => addDependency(s, o.state.id), node.state),
});

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

// ── cert-manager ─────────────────────────────────────────────────────────────
describe('CertManager', () => {
  const ZONE_ROLE = 'arn:aws:iam::111122223333:role/fractal-acme-dns01';
  const fractal = () =>
    createFractal({
      id: 'platform-certificates',
      version,
      boundedContextId,
      blueprint: bp => ({
        certs: bp.add(CertificateManager({id: 'cert-manager'})),
      }),
    });
  const certManager = (config: Parameters<typeof CertManager>[0]) =>
    only(
      fractal().toLiveSystem({
        name: 'platform',
        environment,
        select: {'cert-manager': CertManager(config)},
      }).components,
      'cert-manager',
    );
  const required = {
    hostedZoneId: 'Z0123456789ABCDEFGHIJ',
    role: ZONE_ROLE,
    email: 'platform@fractal.cloud',
  };

  it('is an abstract Security.CertificateManager in the blueprint', () => {
    expect(fractal().blueprint.components.map(c => c.component)).toEqual([
      'Security.CertificateManager',
    ]);
  });

  it('emits the caas-k8s offer with every key under its agent name', () => {
    const c = certManager({
      ...required,
      acmeServer: 'staging',
      clusterIssuerName: 'letsencrypt-staging',
      namespace: 'cert-manager',
    });
    expect([c.type, c.deliveryModel, c.provider]).toEqual([
      'Security.CaaS.CertManager',
      'CaaS',
      undefined,
    ]);
    expect(c.parameters).toEqual({
      hostedZoneId: 'Z0123456789ABCDEFGHIJ',
      role: ZONE_ROLE,
      email: 'platform@fractal.cloud',
      acmeServer: 'staging',
      clusterIssuerName: 'letsencrypt-staging',
      namespace: 'cert-manager',
    });
  });

  it('sends only the required keys when the defaults are wanted', () => {
    expect(certManager(required).parameters).toEqual(required);
  });

  it('accepts an https ACME directory URL', () => {
    expect(
      certManager({
        ...required,
        acmeServer: 'https://acme.zerossl.com/v2/DV90',
      }).parameters.acmeServer,
    ).toBe('https://acme.zerossl.com/v2/DV90');
  });

  it('reads the values as the agent does: trimmed, acmeServer in any case', () => {
    expect(() =>
      certManager({
        hostedZoneId: ' Z0123456789ABCDEFGHIJ ',
        role: ` ${ZONE_ROLE}`,
        email: 'platform@fractal.cloud ',
        acmeServer: 'Production' as 'production',
        clusterIssuerName: ' letsencrypt ',
      }),
    ).not.toThrow();
  });

  it.each([
    [{email: 'a..b@fractal.cloud'}, /email 'a..b@fractal.cloud' is not/],
    [{email: '.a@fractal.cloud'}, /email '.a@fractal.cloud' is not/],
    [{email: 'a@.fractal.cloud'}, /email 'a@.fractal.cloud' is not/],
    [{hostedZoneId: 'zone-1'}, /hostedZoneId 'zone-1' is not a Route 53/],
    [{hostedZoneId: ''}, /hostedZoneId '' is not a Route 53/],
    [
      {role: 'arn:aws:iam::111122223333:user/acme'},
      /role 'arn:aws:iam::111122223333:user\/acme' is not an IAM role ARN/,
    ],
    [{email: 'platform'}, /email 'platform' is not an email address/],
    [
      {acmeServer: 'http://acme.example.com/directory'},
      /acmeServer 'http:\/\/acme.example.com\/directory' is neither production, staging nor an https/,
    ],
    [
      {clusterIssuerName: 'Lets_Encrypt'},
      /clusterIssuerName 'Lets_Encrypt' is not a Kubernetes name/,
    ],
    [{namespace: 'Cert Manager'}, /namespace 'Cert Manager' is not/],
  ])('refuses %o', (override, reason) => {
    const config = {...required, ...override} as Parameters<
      typeof CertManager
    >[0];
    expect(() => certManager(config)).toThrow(reason);
  });
});

// ── SQS exporter ─────────────────────────────────────────────────────────────
describe('SqsExporter', () => {
  const QUEUE_URL =
    'https://sqs.eu-central-1.amazonaws.com/111122223333/orders-events';
  const fractal = (linkQueue: boolean) =>
    createFractal({
      id: 'platform-queue-metrics',
      version,
      boundedContextId,
      blueprint: bp => {
        const inbox = bp.add(MessagingEntity({id: 'inbox'}));
        const exporter = bp.add(Monitoring({id: 'sqs-exporter'}));
        if (linkQueue) {
          bp.link(exporter, inbox);
        }
        return {inbox, exporter};
      },
    });
  const exporter = (
    config: Parameters<typeof SqsExporter>[0],
    linkQueue = true,
    inbox = AwsSqsQueue({}),
  ) =>
    only(
      fractal(linkQueue).toLiveSystem({
        name: 'platform',
        environment,
        select: {inbox, 'sqs-exporter': SqsExporter(config)},
      }).components,
      'sqs-exporter',
    );

  it('watches the linked queue under the caas-k8s offer id', () => {
    const c = exporter({});
    expect([c.type, c.deliveryModel, c.provider]).toEqual([
      'Observability.CaaS.SqsExporter',
      'CaaS',
      undefined,
    ]);
    expect(c.links).toEqual([{componentId: 'inbox', settings: {}}]);
    expect(c.parameters).toEqual({});
  });

  it('watches a queue of another Live System through a reference', () => {
    expect(() =>
      exporter(
        {},
        true,
        referenceTo(AwsSqsQueue, {
          liveSystemId: liveSystemIdOf(PLATFORM, 'messaging'),
          componentId: 'inbox',
        }),
      ),
    ).not.toThrow();
  });

  it('carries every key, queueUrls comma-separated', () => {
    expect(
      exporter({
        namespace: 'monitoring',
        queueUrls: [QUEUE_URL, `${QUEUE_URL}-dlq`],
        monitorIntervalSeconds: 60,
        image: 'registry.example.com/sqs-exporter:1.1.0-arm64',
        nodeSelector: {'kubernetes.io/arch': 'arm64'},
      }).parameters,
    ).toEqual({
      namespace: 'monitoring',
      queueUrls: `${QUEUE_URL},${QUEUE_URL}-dlq`,
      monitorIntervalSeconds: 60,
      image: 'registry.example.com/sqs-exporter:1.1.0-arm64',
      nodeSelector: {'kubernetes.io/arch': 'arm64'},
    });
  });

  it('watches only queueUrls when no queue is linked', () => {
    expect(exporter({queueUrls: [QUEUE_URL]}, false).parameters.queueUrls).toBe(
      QUEUE_URL,
    );
  });

  it('refuses an exporter that watches no queue', () => {
    expect(() => exporter({}, false)).toThrow(
      /'sqs-exporter' watches no queue: link it to Messaging.PaaS.AwsSqsQueue components or set queueUrls/,
    );
  });

  it.each([
    [
      {queueUrls: ['https://sqs.eu-central-1.amazonaws.com/orders']},
      /queueUrls holds 'https:\/\/sqs.eu-central-1.amazonaws.com\/orders'/,
    ],
    [
      {queueUrls: ['http://sqs.eu-central-1.amazonaws.com/111122223333/q']},
      /queueUrls holds/,
    ],
    [{queueUrls: [`${QUEUE_URL},x`]}, /queueUrls holds/],
    [{monitorIntervalSeconds: 0}, /monitorIntervalSeconds 0 is not/],
    [{monitorIntervalSeconds: 1.5}, /monitorIntervalSeconds 1.5 is not/],
    [{image: ' '}, /image ' ' is blank/],
    [{queueUrls: []}, /queueUrls is an empty list/],
    [{nodeSelector: {}}, /nodeSelector is empty/],
    [
      {nodeSelector: {'kubernetes.io/arch': 64}},
      /nodeSelector 'kubernetes.io\/arch' is not a string/,
    ],
  ])('refuses %o', (config, reason) => {
    expect(() => exporter(config as Parameters<typeof SqsExporter>[0])).toThrow(
      reason,
    );
  });
});

// ── TraefikGateway: TLS, ForwardAuth exemption, operator knobs ───────────────
describe('TraefikGateway platform keys', () => {
  const gateway = (config: Parameters<typeof TraefikGateway>[0]) =>
    only(
      createFractal({
        id: 'platform-gateway',
        version,
        boundedContextId,
        blueprint: bp => ({traefik: bp.add(ApiGateway({id: 'traefik'}))}),
      }).toLiveSystem({
        name: 'platform',
        environment,
        select: {traefik: TraefikGateway(config)},
      }).components,
      'traefik',
    );

  it('terminates TLS with a cert-manager certificate and keeps port 80 while migrating', () => {
    expect(
      gateway({
        host: 'api.fractal.cloud',
        tlsClusterIssuer: 'letsencrypt',
        tlsHosts: ['api.fractal.cloud', '*.api.fractal.cloud'],
        plainHttp: true,
      }).parameters,
    ).toEqual({
      host: 'api.fractal.cloud',
      tlsClusterIssuer: 'letsencrypt',
      tlsHosts: 'api.fractal.cloud,*.api.fractal.cloud',
      plainHttp: true,
    });
  });

  it('serves an operator-provided certificate Secret', () => {
    expect(
      gateway({host: 'api.fractal.cloud', tlsSecretName: 'api-tls'}).parameters,
    ).toEqual({host: 'api.fractal.cloud', tlsSecretName: 'api-tls'});
  });

  it('accepts a one-label wildcard covering host', () => {
    expect(() =>
      gateway({
        host: 'api.fractal.cloud',
        tlsClusterIssuer: 'letsencrypt',
        tlsHosts: ['*.fractal.cloud'],
      }),
    ).not.toThrow();
  });

  it('exempts workloads from ForwardAuth by qualified component id', () => {
    expect(
      gateway({
        forwardAuthAddress: 'http://ocelot.security.svc.cluster.local:8080/',
        forwardAuthExemptComponentIds: ['platform/ocelot', 'health'],
      }).parameters.forwardAuthExemptComponentIds,
    ).toBe('platform/ocelot,health');
  });

  it('accepts IPv6 ranges with an embedded IPv4 tail', () => {
    expect(() =>
      gateway({
        loadBalancerSourceRanges: ['::ffff:10.0.0.0/104', '::/0', 'fe80::1/128'],
      }),
    ).not.toThrow();
  });

  it('carries loadBalancerSourceRanges comma-separated and values as an object', () => {
    const values = {deployment: {podAnnotations: {team: 'platform'}}};
    expect(
      gateway({
        loadBalancerSourceRanges: ['10.0.0.0/16', '2001:db8::/32'],
        values,
      }).parameters,
    ).toEqual({
      loadBalancerSourceRanges: '10.0.0.0/16,2001:db8::/32',
      values,
    });
  });

  it.each([
    [
      {tlsHosts: ['api.fractal.cloud']},
      /tlsHosts is set, but neither tlsSecretName nor tlsClusterIssuer/,
    ],
    [{plainHttp: false}, /plainHttp is false and the gateway has no TLS/],
    [
      {
        host: 'api.fractal.cloud',
        tlsClusterIssuer: 'letsencrypt',
        tlsCertificateArn:
          'arn:aws:acm:eu-central-1:111122223333:certificate/abc-123',
      },
      /tlsCertificateArn and Traefik TLS .* both need port 443/,
    ],
    [
      {tlsClusterIssuer: 'letsencrypt'},
      /TLS needs the hosts the certificate covers: set tlsHosts, or host/,
    ],
    [
      {tlsClusterIssuer: 'letsencrypt', tlsHosts: ['*.*.fractal.cloud']},
      /tlsHosts entry '\*.\*.fractal.cloud' is not a host name/,
    ],
    [
      {tlsClusterIssuer: 'letsencrypt', tlsHosts: ['localhost']},
      /tlsHosts entry 'localhost' is not a host name/,
    ],
    [
      {tlsClusterIssuer: 'letsencrypt', tlsHosts: ['a,b.example.com']},
      /tlsHosts entry 'a,b.example.com' is not a host name/,
    ],
    [
      {
        host: 'api.fractal.cloud',
        tlsClusterIssuer: 'letsencrypt',
        tlsHosts: ['www.fractal.cloud'],
      },
      /host 'api.fractal.cloud', the default host of every route, is not covered by tlsHosts/,
    ],
    [
      {
        host: 'deep.api.fractal.cloud',
        tlsClusterIssuer: 'letsencrypt',
        tlsHosts: ['*.fractal.cloud'],
      },
      /is not covered by tlsHosts/,
    ],
    [
      {host: 'api.fractal.cloud', tlsSecretName: 'API_TLS'},
      /tlsSecretName 'API_TLS' is not a Kubernetes name/,
    ],
    [
      {host: 'api.fractal.cloud', tlsClusterIssuer: 'Lets Encrypt'},
      /tlsClusterIssuer 'Lets Encrypt' is not a Kubernetes name/,
    ],
    [
      {
        forwardAuthAddress: 'http://auth/',
        forwardAuthExemptComponentIds: ['platform/'],
      },
      /forwardAuthExemptComponentIds entry 'platform\/' is neither a component id nor/,
    ],
    [
      {
        forwardAuthAddress: 'http://auth/',
        forwardAuthExemptComponentIds: ['/ocelot'],
      },
      /forwardAuthExemptComponentIds entry '\/ocelot'/,
    ],
    [
      {
        forwardAuthAddress: 'http://auth/',
        forwardAuthExemptComponentIds: ['a,b'],
      },
      /forwardAuthExemptComponentIds entry 'a,b'/,
    ],
    [
      {forwardAuthExemptComponentIds: ['ocelot']},
      /ForwardAuth settings without forwardAuthAddress do nothing/,
    ],
    [
      {loadBalancerSourceRanges: ['10.0.0.0/33']},
      /loadBalancerSourceRanges entry '10.0.0.0\/33' is not a CIDR/,
    ],
    [
      {loadBalancerSourceRanges: ['10.0.0.0']},
      /loadBalancerSourceRanges entry '10.0.0.0' is not a CIDR/,
    ],
    [
      {loadBalancerSourceRanges: ['1.2.3.4::1/64']},
      /loadBalancerSourceRanges entry '1.2.3.4::1\/64' is not a CIDR/,
    ],
    [
      {loadBalancerSourceRanges: ['2001:db8::1::/64']},
      /is not a CIDR/,
    ],
    [
      {loadBalancerSourceRanges: ['1:2:3:4:5:6:7:8:9/64']},
      /is not a CIDR/,
    ],
    [
      {loadBalancerSourceRanges: ['2001:dg8::/32']},
      /is not a CIDR/,
    ],
    [
      {
        forwardAuthAddress: 'http://auth/',
        forwardAuthExemptComponentIds: [],
      },
      /forwardAuthExemptComponentIds is an empty list/,
    ],
    [
      {
        forwardAuthAddress: 'http://auth/',
        forwardAuthRequestHeaders: [],
      },
      /forwardAuthRequestHeaders is an empty list/,
    ],
    [{loadBalancerSourceRanges: []}, /loadBalancerSourceRanges is an empty list/],
    [
      {host: 'api.fractal.cloud', tlsClusterIssuer: 'letsencrypt', tlsHosts: []},
      /tlsHosts is an empty list/,
    ],
    [
      {loadBalancerSourceRanges: ['2001:db8::/129']},
      /loadBalancerSourceRanges entry '2001:db8::\/129' is not a CIDR/,
    ],
  ])('refuses %o', (config, reason) => {
    expect(() =>
      gateway(config as Parameters<typeof TraefikGateway>[0]),
    ).toThrow(reason);
  });

  it('is a CloudFront VPC origin when Traefik terminates TLS', () => {
    expect(() =>
      createFractal({
        id: 'platform-edge',
        version,
        boundedContextId,
        blueprint: bp => {
          const traefik = bp.add(ApiGateway({id: 'traefik'}));
          const cdn = bp.add(ApiGateway({id: 'cdn'}));
          bp.link(cdn, traefik);
          return {traefik, cdn};
        },
      }).toLiveSystem({
        name: 'platform',
        environment,
        select: {
          traefik: TraefikGateway({
            host: 'api.fractal.cloud',
            tlsClusterIssuer: 'letsencrypt',
          }),
          cdn: AwsCloudFront({
            aliases: ['api.fractal.cloud'],
            originProtocol: 'https',
          }),
        },
      }),
    ).not.toThrow();
  });
});

// ── Grafana stack ────────────────────────────────────────────────────────────
describe('caas-k8s observability parameters and links', () => {
  type Links = {loki?: string[]; tempo?: string[]};
  const stack = (
    select: {
      prometheus?: ReturnType<typeof KubePrometheusStack>;
      loki?: ReturnType<typeof GrafanaLoki>;
      tempo?: ReturnType<typeof GrafanaTempo>;
      alloy?: ReturnType<typeof GrafanaAlloy>;
    },
    opts: {
      links?: Links;
      access?: string;
      alloyDependsOnLoki?: boolean;
      retentionDays?: number;
    } = {},
  ) => {
    const links = opts.links ?? {
      loki: ['loki-chunks'],
      tempo: ['tempo-traces'],
    };
    return createFractal({
      id: 'platform-observability',
      version,
      boundedContextId,
      blueprint: bp => {
        const lokiChunks = bp.add(ObjectStorage({id: 'loki-chunks'}));
        const tempoTraces = bp.add(ObjectStorage({id: 'tempo-traces'}));
        const buckets: Record<string, ComponentNode> = {
          'loki-chunks': lokiChunks,
          'tempo-traces': tempoTraces,
        };
        const metrics = Monitoring({id: 'prometheus'});
        const prometheus = bp.add(
          opts.retentionDays === undefined
            ? metrics
            : metrics.withRetentionDays(opts.retentionDays),
        );
        const loki = bp.add(Logging({id: 'loki'}).withRetentionDays(14));
        const tempo = bp.add(Tracing({id: 'tempo'}));
        const alloy = bp.add(
          opts.alloyDependsOnLoki === false
            ? Logging({id: 'alloy'})
            : dependingOn(Logging({id: 'alloy'}), loki),
        );
        for (const id of links.loki ?? []) {
          bp.link(loki, buckets[id], {access: opts.access ?? 'read-write'});
        }
        for (const id of links.tempo ?? []) {
          bp.link(tempo, buckets[id], {access: opts.access ?? 'read-write'});
        }
        return {lokiChunks, tempoTraces, prometheus, loki, tempo, alloy};
      },
    }).toLiveSystem({
      name: 'platform',
      environment,
      select: {
        'loki-chunks': AwsS3({lifecycleExpirationDays: 14}),
        'tempo-traces': referenceTo(AwsS3, {
          liveSystemId: liveSystemIdOf(PLATFORM, 'buckets'),
          componentId: 'tempo-traces',
        }),
        prometheus: select.prometheus ?? KubePrometheusStack({}),
        loki: select.loki ?? GrafanaLoki({}),
        tempo: select.tempo ?? GrafanaTempo({}),
        alloy: select.alloy ?? GrafanaAlloy({}),
      },
    }).components;
  };

  it('kube-prometheus-stack carries every key, retention from the component', () => {
    const alertRules = {
      'dead-letters': {
        groups: [
          {
            name: 'dlq',
            rules: [
              {
                alert: 'DeadLetters',
                expr: 'sqs_approximatenumberofmessages{queue=~".*-dlq"} > 0',
              },
            ],
          },
        ],
      },
    };
    const alertmanagerConfig = {
      route: {receiver: 'ops'},
      receivers: [{name: 'ops'}],
    };
    const values = {grafana: {replicas: 2}};
    expect(
      only(
        stack(
          {
            prometheus: KubePrometheusStack({
              namespace: 'monitoring',
              storageClassName: 'gp3',
              prometheusStorageGi: 100,
              lokiUrl: 'none',
              tempoUrl: 'http://tempo.tracing.svc.cluster.local:3200',
              alertRules,
              alertmanagerConfig,
              values,
            }),
          },
          {retentionDays: 30},
        ),
        'prometheus',
      ).parameters,
    ).toEqual({
      retentionDays: 30,
      namespace: 'monitoring',
      storageClassName: 'gp3',
      prometheusStorageGi: 100,
      lokiUrl: 'none',
      tempoUrl: 'http://tempo.tracing.svc.cluster.local:3200',
      alertRules,
      alertmanagerConfig,
      values,
    });
  });

  it('Loki and Tempo carry their keys and keep their bucket links', () => {
    const components = stack({
      loki: GrafanaLoki({namespace: 'monitoring', storageClassName: 'gp3'}),
      tempo: GrafanaTempo({namespace: 'monitoring', values: {tempo: {}}}),
    });
    const loki = only(components, 'loki');
    expect(loki.parameters).toEqual({
      retentionDays: 14,
      namespace: 'monitoring',
      storageClassName: 'gp3',
    });
    expect(loki.links).toEqual([
      {componentId: 'loki-chunks', settings: {access: 'read-write'}},
    ]);
    expect(only(components, 'tempo').parameters).toEqual({
      namespace: 'monitoring',
      values: {tempo: {}},
    });
  });

  it('Alloy ships to the Loki it depends on, or to lokiPushUrl', () => {
    expect(only(stack({}), 'alloy').dependencies).toEqual(['loki']);
    expect(
      only(
        stack(
          {
            alloy: GrafanaAlloy({
              lokiPushUrl:
                'http://loki.logs.svc.cluster.local:3100/loki/api/v1/push',
            }),
          },
          {alloyDependsOnLoki: false},
        ),
        'alloy',
      ).parameters,
    ).toEqual({
      lokiPushUrl: 'http://loki.logs.svc.cluster.local:3100/loki/api/v1/push',
    });
  });

  it.each([
    [
      'Loki without a bucket',
      {},
      {links: {tempo: ['tempo-traces']}},
      /'loki' keeps its data in S3: link it to a Storage.PaaS.AwsS3 bucket with access read-write/,
    ],
    [
      'Tempo with two buckets',
      {},
      {links: {loki: ['loki-chunks'], tempo: ['tempo-traces', 'loki-chunks']}},
      /'tempo' links to 2 buckets; link exactly one, with access read-write/,
    ],
    [
      'a bucket link that is not read-write',
      {},
      {access: 'read'},
      /the link from 'loki' to bucket 'loki-chunks' needs access read-write, got 'read'/,
    ],
    [
      'Alloy with neither a Loki dependency nor lokiPushUrl',
      {},
      {alloyDependsOnLoki: false},
      /'alloy' ships logs to Loki: make it depend on an Observability.CaaS.GrafanaLoki component, or set lokiPushUrl/,
    ],
    [
      'a lokiPushUrl that is not http(s)',
      {alloy: GrafanaAlloy({lokiPushUrl: 'loki:3100'})},
      {},
      /lokiPushUrl 'loki:3100' is not an absolute http\(s\) URL/,
    ],
    [
      'a lokiUrl that is neither none nor http(s)',
      {prometheus: KubePrometheusStack({lokiUrl: 'ftp://loki'})},
      {},
      /lokiUrl 'ftp:\/\/loki' is neither none nor an absolute http\(s\) URL/,
    ],
    [
      'prometheusStorageGi 0',
      {prometheus: KubePrometheusStack({prometheusStorageGi: 0})},
      {},
      /prometheusStorageGi 0 is not a whole number of at least 1/,
    ],
    [
      'a retention of 0 days',
      {},
      {retentionDays: 0},
      /retentionDays 0 is not a whole number of at least 1/,
    ],
    [
      'a storageClassName that is not a Kubernetes name',
      {loki: GrafanaLoki({storageClassName: 'GP3'})},
      {},
      /storageClassName 'GP3' is not a Kubernetes name/,
    ],
  ])('refuses %s', (_name, select, opts, reason) => {
    expect(() => stack(select, opts)).toThrow(reason);
  });
});
