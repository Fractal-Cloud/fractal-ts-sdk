/**
 * restored_offer_checks.test.ts — the offer checks 2.13.0 had dropped and the
 * 2.13.0 release review restored, each mirroring the rule the reconciling agent
 * (or the Kubernetes API behind it) applies, so a Live System it would fail is
 * refused while it is being built. The PR that restored them lists every check
 * 2.12.0 made and where it lives now.
 */
import {describe, expect, it} from 'vitest';
import {createFractal, type LiveSystemComponent} from './core';
import {ApiGateway} from './components/api_management';
import {ContainerPlatform} from './components/network_and_compute';
import {MessagingEntity} from './components/messaging';
import {
  Logging,
  LogShipper,
  Monitoring,
  Tracing,
} from './components/observability';
import {ObjectStorage, RelationalDbms} from './components/storage';
import {AwsCloudFront, TraefikGateway} from './offers/api_management';
import {AwsSnsTopic, AwsSqsQueue} from './offers/messaging';
import {Eks} from './offers/network_and_compute';
import {
  GrafanaAlloy,
  GrafanaLoki,
  GrafanaTempo,
  KubePrometheusStack,
  SqsExporter,
} from './offers/observability';
import {AwsRdsMySqlDbms, AwsRdsPostgresDbms, AwsS3} from './offers/storage';

const environment = {};
const boundedContextId = {name: 'platform'};
const version = {major: 1, minor: 0, patch: 0};

/** Builds a one-component Live System (plus a bucket or queue when asked) and returns it. */
const build = (
  node: Parameters<
    Parameters<typeof createFractal>[0]['blueprint']
  >[0] extends {
    add: (n: infer N) => unknown;
  }
    ? N
    : never,
  offer: unknown,
  extra: 'bucket' | 'queue' | 'none' = 'none',
): LiveSystemComponent => {
  const id = (node as {state: {id: string}}).state.id;
  const ls = createFractal({
    id: 'restored-checks',
    version,
    boundedContextId,
    blueprint: bp => {
      const main = bp.add(node);
      if (extra === 'bucket') {
        const bucket = bp.add(ObjectStorage({id: 'bucket'}));
        bp.link(main, bucket, {access: 'read-write'});
        return {main, bucket};
      }
      if (extra === 'queue') {
        const queue = bp.add(MessagingEntity({id: 'queue'}));
        bp.link(main, queue);
        return {main, queue};
      }
      return {main};
    },
  }).toLiveSystem({
    name: 'platform',
    environment,
    select: {
      [id]: offer,
      ...(extra === 'bucket' ? {bucket: AwsS3({})} : {}),
      ...(extra === 'queue' ? {queue: AwsSqsQueue({})} : {}),
    } as never,
  });
  return ls.components.find(c => c.id === id)!;
};

const cloudFront = (config: Record<string, unknown>, bucket = false) =>
  build(
    ApiGateway({id: 'edge'}),
    AwsCloudFront(config as never),
    bucket ? 'bucket' : 'none',
  );

describe('AwsCloudFront redirectTo, site keys', () => {
  it.each([
    ['http://fractal.cloud', 'it must start with https://'],
    [
      'https://user:pass@fractal.cloud',
      'it may carry neither credentials nor a port',
    ],
    [
      'https://fractal.cloud:8443',
      'it may carry neither credentials nor a port',
    ],
    [
      'https://fractal.cloud/?a=1',
      "the request's own query string is appended, so it may carry neither a query nor a fragment",
    ],
    [
      'https://fractal.cloud/#x',
      "the request's own query string is appended, so it may carry neither a query nor a fragment",
    ],
    ['https://example.123', 'its host is not a DNS host name'],
    [
      'https://fractal.cloud/a b',
      'its path holds characters a URL path may not (or a malformed percent escape)',
    ],
    [
      'https://fractal.cloud/%zz',
      'its path holds characters a URL path may not (or a malformed percent escape)',
    ],
    ['fractal.cloud', 'it is not a URL of the form https://host[/path]'],
  ])('refuses redirectTo %s', (redirectTo, why) => {
    expect(() => cloudFront({redirectTo})).toThrow(
      `Live component 'edge': redirectTo '${redirectTo}' is not a redirect target: ${why}.`,
    );
  });

  it.each([
    [{defaultRootObject: '/index.html'}, 'defaultRootObject'],
    [{errorDocument: '../404.html'}, 'errorDocument'],
  ])('refuses an object key the agent refuses: %o', (config, key) => {
    expect(() => cloudFront(config, true)).toThrow(
      `Live component 'edge': ${key} '${Object.values(config)[0]}' is not an object key`,
    );
  });

  it('refuses a spaFallback that is not a boolean, and spaFallback with errorDocument', () => {
    expect(() => cloudFront({spaFallback: 'yes'}, true)).toThrow(
      "Live component 'edge': spaFallback 'yes' is not a boolean.",
    );
    expect(() =>
      cloudFront({spaFallback: true, errorDocument: '404.html'}, true),
    ).toThrow(
      "Live component 'edge': spaFallback answers every missing key with the root object",
    );
  });
});

const gateway = (config: Record<string, unknown>) =>
  build(ApiGateway({id: 'traefik'}), TraefikGateway(config as never));

describe('TraefikGateway', () => {
  it.each([
    [
      {namespace: 'Traefik'},
      "namespace 'Traefik' is not a Kubernetes namespace name",
    ],
    [
      {forwardAuthRequestHeaders: ['x-ok']},
      'ForwardAuth settings without forwardAuthAddress do nothing',
    ],
    [
      {
        forwardAuthAddress: 'http://auth/',
        forwardAuthRequestHeaders: ['bad header'],
      },
      "forwardAuthRequestHeaders holds 'bad header', which is not a header name",
    ],
    [
      {
        forwardAuthAddress: 'http://auth/',
        forwardAuthExemptComponentIds: ['/x'],
      },
      "forwardAuthExemptComponentIds entry '/x' is neither a component id nor <liveSystemId>/<componentId>",
    ],
    [
      {forwardAuthAddress: 'http://auth/', forwardAuthMaxBodySize: 0},
      'forwardAuthMaxBodySize 0 is not a whole number of bytes of at least 1',
    ],
    [
      {forwardAuthExcludedPrefixes: ['/health']},
      'forwardAuthExcludedPrefixes was removed: the agent no longer reads it and a path never exempts a route. Exempt workloads with forwardAuthExemptComponentIds',
    ],
    [
      {loadBalancerSourceRanges: ['10.0.0.0/33']},
      "loadBalancerSourceRanges entry '10.0.0.0/33' is not a CIDR",
    ],
    [{host: 'not a host'}, "host 'not a host' is not a host name"],
    [{replicas: 0}, 'replicas 0 is not a whole number of at least 1'],
    [
      {entryPointIdleTimeoutSeconds: 0},
      'entryPointIdleTimeoutSeconds 0 is not a whole number of seconds of at least 1',
    ],
    [
      {tlsCertificateArn: 'arn:aws:acm:eu-west-1:1:certificate/x'},
      "tlsCertificateArn 'arn:aws:acm:eu-west-1:1:certificate/x' is not an ACM certificate ARN",
    ],
    [
      {tlsSecretName: 'Bad_Name'},
      "tlsSecretName 'Bad_Name' is not a Kubernetes name",
    ],
    [
      {tlsSecretName: 'api-tls'},
      'TLS needs the hosts the certificate covers: set tlsHosts, or host',
    ],
    [
      {tlsSecretName: 'api-tls', tlsHosts: ['*.*.example.com']},
      "tlsHosts entry '*.*.example.com' is not a host name or a one-label wildcard (*.example.com)",
    ],
    [
      {
        tlsSecretName: 'api-tls',
        host: 'api.other.com',
        tlsHosts: ['*.example.com'],
      },
      "host 'api.other.com', the default host of every route, is not covered by tlsHosts *.example.com",
    ],
    [
      {plainHttp: false},
      'plainHttp is false and the gateway has no TLS (tlsSecretName, or dnsZones with TXT write on the zone of its hosts): it would serve nothing',
    ],
    [
      {
        tlsSecretName: 'api-tls',
        host: 'api.example.com',
        tlsCertificateArn:
          'arn:aws:acm:eu-west-1:111122223333:certificate/abc-123',
      },
      "tlsCertificateArn and Traefik TLS (tlsSecretName, or the gateway's own certificate) both need port 443: choose one",
    ],
    [
      {acmeEmail: 'ops at example.com'},
      "acmeEmail 'ops at example.com' is not an email address",
    ],
    [
      {acmeServer: 'http://acme.example.com/dir'},
      "acmeServer 'http://acme.example.com/dir' is neither production, staging nor an https ACME directory URL",
    ],
  ])('refuses %o', (config, why) => {
    expect(() => gateway(config)).toThrow(`Live component 'traefik': ${why}.`);
  });

  it('accepts a TLS gateway the agent accepts', () => {
    expect(() =>
      gateway({
        namespace: 'traefik',
        tlsSecretName: 'api-tls',
        host: 'api.example.com',
        tlsHosts: ['*.example.com'],
        plainHttp: false,
        loadBalancerSourceRanges: ['10.0.0.0/8', '::ffff:10.0.0.0/104'],
        replicas: 2,
        forwardAuthAddress: 'http://auth.security.svc:8080/',
        forwardAuthRequestHeaders: ['authorization', 'x-clientid'],
        forwardAuthMaxBodySize: 1024,
      }),
    ).not.toThrow();
  });
});

const eks = (config: Record<string, unknown>) =>
  build(ContainerPlatform({id: 'eks'}), Eks(config as never));

describe('Eks node pools and log types', () => {
  it.each([
    [[{name: ' '}], 'a node pool needs a name'],
    [
      [{name: 'Graviton'}],
      "node pool name 'Graviton' is not a DNS-1123 label (a-z, 0-9 and '-', at most 63)",
    ],
    [
      [{name: 'system', architectures: ['arm64']}],
      "node pool name 'system' is reserved for an EKS Auto Mode built-in pool",
    ],
    [
      [{name: 'general-purpose'}],
      "node pool name 'general-purpose' is reserved for an EKS Auto Mode built-in pool",
    ],
    [[{name: 'a'}, {name: 'a'}], "node pool name 'a' twice"],
    [
      [{name: 'a', architectures: ['x86']}],
      "node pool 'a' architectures holds 'x86' (arm64 or amd64)",
    ],
    [
      [{name: 'a', capacityTypes: ['reserved']}],
      "node pool 'a' capacityTypes holds 'reserved' (on-demand or spot)",
    ],
  ])('refuses nodePools %o', (nodePools, why) => {
    expect(() => eks({nodePools})).toThrow(`Eks 'eks': ${why}.`);
  });

  it('refuses a control-plane log type the agent does not know, case-insensitively as it reads them', () => {
    expect(() => eks({controlPlaneLogTypes: ['api', 'kubelet']})).toThrow(
      "Eks 'eks': controlPlaneLogTypes holds 'kubelet' (one of api, audit, authenticator, controllerManager, scheduler).",
    );
    expect(() =>
      eks({controlPlaneLogTypes: ['API', 'ControllerManager']}),
    ).not.toThrow();
  });
});

describe('Grafana stack and SqsExporter', () => {
  const kps = (config: Record<string, unknown>, retention?: number) =>
    build(
      retention === undefined
        ? Monitoring({id: 'kps'})
        : Monitoring({id: 'kps'}).withRetentionDays(retention),
      KubePrometheusStack(config as never),
    );

  it.each([
    [
      {namespace: 'Monitoring'},
      "namespace 'Monitoring' is not a Kubernetes namespace name",
    ],
    [
      {storageClassName: 'Fast_SSD'},
      "storageClassName 'Fast_SSD' is not a Kubernetes name",
    ],
    [
      {prometheusStorageGi: 0},
      'prometheusStorageGi 0 is not a whole number of at least 1',
    ],
    [
      {lokiUrl: 'loki:3100'},
      "lokiUrl 'loki:3100' is neither none nor an absolute http(s) URL",
    ],
    [
      {tempoUrl: 'http://tempo/%zz'},
      "tempoUrl 'http://tempo/%zz' is neither none nor an absolute http(s) URL",
    ],
  ])('KubePrometheusStack refuses %o', (config, why) => {
    expect(() => kps(config)).toThrow(`Live component 'kps': ${why}.`);
  });

  it('KubePrometheusStack refuses a retention below a day, and takes none / URLs', () => {
    expect(() => kps({}, 0)).toThrow(
      "Live component 'kps': retentionDays 0 is not a whole number of at least 1.",
    );
    expect(() =>
      kps({lokiUrl: 'none', tempoUrl: 'http://tempo.monitoring:3100'}),
    ).not.toThrow();
  });

  it.each([
    ['GrafanaLoki', () => Logging({id: 'logs'}), GrafanaLoki],
    ['GrafanaTempo', () => Tracing({id: 'logs'}), GrafanaTempo],
  ] as const)(
    '%s refuses a bad namespace, storage class and retention',
    (_n, node, offer) => {
      expect(() =>
        build(node(), offer({namespace: 'Bad_NS'} as never), 'bucket'),
      ).toThrow(
        "Live component 'logs': namespace 'Bad_NS' is not a Kubernetes namespace name.",
      );
      expect(() =>
        build(node(), offer({storageClassName: 'Bad_SC'} as never), 'bucket'),
      ).toThrow(
        "Live component 'logs': storageClassName 'Bad_SC' is not a Kubernetes name.",
      );
      expect(() =>
        build(
          (node() as ReturnType<typeof Logging>).withRetentionDays(1.5),
          offer({} as never),
          'bucket',
        ),
      ).toThrow(
        "Live component 'logs': retentionDays 1.5 is not a whole number of at least 1.",
      );
    },
  );

  it('GrafanaAlloy refuses a bad namespace and a lokiPushUrl that is not an http(s) URL', () => {
    expect(() =>
      build(
        LogShipper({id: 'alloy'}),
        GrafanaAlloy({namespace: 'X', lokiPushUrl: 'http://loki/'} as never),
      ),
    ).toThrow(
      "Live component 'alloy': namespace 'X' is not a Kubernetes namespace name.",
    );
    expect(() =>
      build(
        LogShipper({id: 'alloy'}),
        GrafanaAlloy({lokiPushUrl: 'loki:3100'} as never),
      ),
    ).toThrow(
      "Live component 'alloy': lokiPushUrl 'loki:3100' is not an absolute http(s) URL.",
    );
  });

  it('SqsExporter refuses a bad namespace and a blank imagePullSecrets entry', () => {
    expect(() =>
      build(
        Monitoring({id: 'exp'}),
        SqsExporter({namespace: 'Mon'} as never),
        'queue',
      ),
    ).toThrow(
      "Live component 'exp': namespace 'Mon' is not a Kubernetes namespace name.",
    );
    expect(() =>
      build(
        Monitoring({id: 'exp'}),
        SqsExporter({imagePullSecrets: ['ok', ' ']} as never),
        'queue',
      ),
    ).toThrow(
      "Live component 'exp': imagePullSecrets holds a blank entry, which the agent would drop: remove it.",
    );
  });
});

describe('AWS RDS DBMS and SNS', () => {
  const dbms = (offer: unknown) => build(RelationalDbms({id: 'db'}), offer);

  it.each([
    ['AwsRdsPostgresDbms', AwsRdsPostgresDbms, 63],
    ['AwsRdsMySqlDbms', AwsRdsMySqlDbms, 16],
  ] as const)(
    '%s refuses what the AWS agent refuses',
    (name, offer, maxLogin) => {
      expect(() => dbms(offer({storageType: 'gp9'} as never))).toThrow(
        `${name} 'db': storageType 'gp9' is not one of gp2, gp3, io1, io2, standard.`,
      );
      expect(() =>
        dbms(offer({administratorLogin: 'a'.repeat(maxLogin + 1)} as never)),
      ).toThrow(`characters, the engine's limit.`);
      expect(() =>
        dbms(offer({requireSecureTransport: 'yes'} as never)),
      ).toThrow(
        `${name} 'db': requireSecureTransport must be true or false, not "yes".`,
      );
      expect(() => dbms(offer({cloudwatchLogExports: [5]} as never))).toThrow(
        `${name} 'db': cloudwatchLogExports must be a list of log type names.`,
      );
      expect(() =>
        dbms(
          offer({
            storageType: 'GP3',
            administratorLogin: 'a'.repeat(maxLogin),
            requireSecureTransport: 'TRUE',
            cloudwatchLogExports: 'error,slowquery',
          } as never),
        ),
      ).not.toThrow();
    },
  );

  it('AwsSnsTopic refuses a maximumMessageSize outside what SNS takes', () => {
    for (const size of [1023, 1048577, 2048.5]) {
      expect(() =>
        build(
          MessagingEntity({id: 'events'}),
          AwsSnsTopic({maximumMessageSize: size} as never),
        ),
      ).toThrow(
        `AwsSnsTopic 'events': maximumMessageSize ${size} is not a whole number of bytes from 1024 to 1048576.`,
      );
    }
  });
});
