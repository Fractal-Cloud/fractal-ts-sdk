/**
 * offer_contracts.test.ts — every offer against the parameter contract its
 * agent publishes (docs/offer-contracts.md).
 *
 * 1. Every offer whose agent publishes a contract is defined from it; the
 *    offers whose agent publishes none are exactly the ones listed below, each
 *    with the producer-side reason.
 * 2. Every offer, instantiated with EVERY neutral setter of its component, is
 *    checked against the contracts of the components it emits. A key the
 *    contract does not declare is not silently accepted: the complete list of
 *    such keys is pinned in contracts/undeclared-parameters.json, so a new one
 *    (the way `scheme` once reached load balancers whose agents read
 *    `lbScheme`) fails here until it is translated to a contract key or
 *    knowingly added to that inventory.
 */
import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import * as apiManagementComponents from './components/api_management';
import * as bigDataComponents from './components/big_data';
import * as customWorkloadComponents from './components/custom_workloads';
import * as dnsComponents from './components/dns';
import * as messagingComponents from './components/messaging';
import * as networkComponents from './components/network_and_compute';
import * as observabilityComponents from './components/observability';
import * as securityComponents from './components/security';
import * as storageComponents from './components/storage';
import * as unmanagedComponents from './components/unmanaged';
import * as apiManagementOffers from './offers/api_management';
import * as bigDataOffers from './offers/big_data';
import * as customWorkloadOffers from './offers/custom_workloads';
import * as dnsOffers from './offers/dns';
import * as messagingOffers from './offers/messaging';
import * as networkOffers from './offers/network_and_compute';
import * as observabilityOffers from './offers/observability';
import * as securityOffers from './offers/security';
import * as storageOffers from './offers/storage';
import * as unmanagedOffers from './offers/unmanaged';
import * as aiContracts from './offers/generated/ai';
import * as apiManagementContracts from './offers/generated/api_management';
import * as bigDataContracts from './offers/generated/big_data';
import * as customWorkloadContracts from './offers/generated/custom_workloads';
import * as messagingContracts from './offers/generated/messaging';
import * as networkContracts from './offers/generated/network_and_compute';
import * as observabilityContracts from './offers/generated/observability';
import * as securityContracts from './offers/generated/security';
import * as storageContracts from './offers/generated/storage';
import {secretRef} from './secret';
import type {LiveSystemComponent, Offer} from './core';
import type {OfferContract} from './offers/contract/offer_contract';
import type {NeutralRule} from './neutral_rule';
import {neutralSetterName} from './apply_neutral_rules';

type OfferConstructor = ((config: never) => Offer) & {
  readonly offerType: string;
  readonly satisfies: string;
  readonly contract?: OfferContract;
  readonly neutral?: Readonly<Record<string, NeutralRule>>;
};

const isOfferConstructor = (v: unknown): v is OfferConstructor =>
  typeof v === 'function' &&
  typeof (v as {offerType?: unknown}).offerType === 'string' &&
  typeof (v as {satisfies?: unknown}).satisfies === 'string';

const OFFERS: ReadonlyArray<[string, OfferConstructor]> = [
  apiManagementOffers,
  bigDataOffers,
  customWorkloadOffers,
  dnsOffers,
  messagingOffers,
  networkOffers,
  observabilityOffers,
  securityOffers,
  storageOffers,
  unmanagedOffers,
]
  .flatMap(m => Object.entries(m))
  .filter((e): e is [string, OfferConstructor] => isOfferConstructor(e[1]))
  .sort(([a], [b]) => a.localeCompare(b));

const CONTRACTS = new Map<string, OfferContract>(
  [
    aiContracts,
    apiManagementContracts,
    bigDataContracts,
    customWorkloadContracts,
    messagingContracts,
    networkContracts,
    observabilityContracts,
    securityContracts,
    storageContracts,
  ]
    .flatMap(m => Object.values(m) as OfferContract[])
    .map(c => [c.offerType, c]),
);

/**
 * Offers whose agent publishes no contract the SDK can read, and why. Each is
 * a gap in the producing repository, not in this SDK: when it closes, the
 * offer moves to its generated contract and leaves this list.
 */
const UNPUBLISHED: Readonly<Record<string, string>> = {
  HetznerFirewall: 'aria-agent-hetzner has never cut a release',
  HetznerNetwork: 'aria-agent-hetzner has never cut a release',
  HetznerServer: 'aria-agent-hetzner has never cut a release',
  HetznerSubnet: 'aria-agent-hetzner has never cut a release',
  VspherePortGroup: 'aria-agent-vmware releases no contract',
  VsphereVlan: 'aria-agent-vmware releases no contract',
  VsphereVm: 'aria-agent-vmware releases no contract',
  Keycloak: 'no agent declares Security.CaaS.Keycloak',
  StorageOpenSearch:
    'aria-agent-caas-k8s has not released Storage.CaaS.OpenSearch yet',
};

/** One argument per neutral setter, so every guardrail of a component is set. */
const SETTER_VALUES: Readonly<Record<string, unknown>> = {
  withAllowBulkDelete: true,
  withAllowedRecordTypes: ['A', 'CNAME'],
  withAuthenticationMode: 'jwt',
  withAutoTerminationMinutes: 30,
  withAutoscaling: {minReplicas: 2, maxReplicas: 6, targetCpuUtilization: 70},
  withBackupRetentionDays: 7,
  withCaaIssuers: ['letsencrypt.org'],
  withCharset: 'UTF8',
  withCidrBlock: '10.0.0.0/24',
  withClusterName: 'analytics',
  withCollation: 'en_US.UTF-8',
  withConcurrency: 10,
  withCors: {allowOrigins: ['https://app.example.com']},
  withCpuRequest: '250m',
  withCronSchedule: '0 0 * * *',
  withCustomDomain: 'api.example.com',
  withDataSecurityMode: 'SINGLE_USER',
  withDnsZones: [{name: 'example.com', access: {TXT: 'write'}}],
  withDeadLetterEnabled: true,
  withDnssec: 'optional',
  withDomainName: 'example.com',
  withEgressRules: [{protocol: 'tcp', fromPort: 443, sourceCidr: '0.0.0.0/0'}],
  withEncryption: 'at-rest',
  withEngineVersion: '16',
  withEnv: {LOG_LEVEL: 'info'},
  withEnvironment: {LOG_LEVEL: 'info'},
  withExperimentName: 'churn',
  withHealthCheck: {path: '/health', port: 8080},
  withHighAvailability: 'zone-redundant',
  withHttpsOnly: true,
  withImage: 'registry/accounts:2.21.12',
  withIngressRules: [{protocol: 'tcp', fromPort: 443, sourceCidr: '0.0.0.0/0'}],
  withJobName: 'nightly',
  withKubernetesVersion: '1.33',
  withLivenessProbe: {path: '/health/live', initialDelaySeconds: 30},
  withMaxDeliveryAttempts: 5,
  withMaxReplicas: 6,
  withMaxRetries: 2,
  withMaxWorkers: 4,
  withMemory: 512,
  withMemoryRequest: '512Mi',
  withMessageRetentionHours: 24,
  withMfaConfiguration: 'OPTIONAL',
  withMinWorkers: 1,
  withMtlsMode: 'strict',
  withNetworkPolicyProvider: 'calico',
  withNodePools: [{name: 'general', minNodeCount: 1, maxNodeCount: 3}],
  withNodeSelector: {'kubernetes.io/arch': 'arm64'},
  withOsType: 'linux',
  withPartitionCount: 2,
  withPasswordPolicy: {minLength: 12},
  withPodDisruptionBudget: {minAvailable: 1},
  withPort: 8080,
  withPreStopSleepSeconds: 10,
  withPublicAccess: false,
  withPublicSSHKey: 'ssh-ed25519 AAAAexample',
  withRateLimit: {requestsPerSecond: 100},
  withReadinessProbe: {path: '/health/ready', port: 8080},
  withRecordManagement: 'lax',
  withRecords: [
    {name: 'www', type: 'CNAME', ttl: 300, values: ['example.com']},
  ],
  withReplicas: 2,
  withResources: {
    requests: {cpu: '250m', memory: '512Mi'},
    limits: {cpu: '1', memory: '1Gi'},
  },
  withRetentionDays: 14,
  withRollout: {maxSurge: 1, maxUnavailable: 0},
  withRoutes: [{path: '/api', methods: ['GET']}],
  withRuntime: 'python3.12',
  withSamplingRate: 0.1,
  withScheme: 'internal',
  withScrapeInterval: 30,
  withSecretEnv: {DB_PASSWORD: secretRef('accounts-db-password')},
  withSessionDuration: 3600,
  withSize: 'small',
  withSizeTier: 'small',
  withSourceArtifact: 'https://artifacts.example.com/fn.zip',
  withSparkVersion: '15.4.x-scala2.12',
  withStartupProbe: {path: '/health/started', failureThreshold: 30},
  withStorageClass: 'standard',
  withStorageGb: 32,
  withSubdomainDelegation: false,
  withTags: {team: 'platform'},
  withTaskType: 'PYTHON',
  withTerminationGracePeriodSeconds: 90,
  withTier: 'standard',
  withTimeout: 30,
  withTopologySpread: true,
  withTtlBounds: {minTtl: 60, maxTtl: 3600},
  withUserDirectoryName: 'customers',
  withVersioningEnabled: true,
  withVisibility: 'public',
  withWorkspaceName: 'analytics',
};

/**
 * Setters left out: `withTopic` takes another component, not a value; the
 * older Workload setters each set the same contract key as a newer one
 * (`withAutoscaling`, `withResources`, the probes), which a component may not
 * lock twice. kubernetes_workload_params.test.ts covers their translation.
 */
const NOT_PARAMETERS = new Set([
  'withTopic',
  'withMaxReplicas',
  'withCpuRequest',
  'withMemoryRequest',
  'withHealthCheck',
]);

/** Config an offer cannot be instantiated without; every other offer gets `{}`. */
const SAMPLE_CONFIG: Readonly<Record<string, unknown>> = {};

type ProbedNode = {
  state: {
    id: string;
    component: string;
    parameters: Readonly<Record<string, unknown>>;
    locked: ReadonlySet<string>;
  };
};

/** Every neutral setter of `node`, applied once. */
const setEverything = (node: ProbedNode): ProbedNode => {
  let current = node;
  for (const name of Object.keys(node)) {
    if (!name.startsWith('with') || NOT_PARAMETERS.has(name)) {
      continue;
    }
    if (!(name in SETTER_VALUES)) {
      throw new Error(`no SETTER_VALUES entry for ${name}`);
    }
    const setter = (
      current as unknown as Record<string, (v: unknown) => ProbedNode>
    )[name];
    current = setter(SETTER_VALUES[name]);
  }
  return current;
};

/** Each component type with every neutral parameter set. */
const NEUTRAL = new Map<string, ProbedNode['state']>(
  [
    apiManagementComponents,
    bigDataComponents,
    customWorkloadComponents,
    dnsComponents,
    messagingComponents,
    networkComponents,
    observabilityComponents,
    securityComponents,
    storageComponents,
    unmanagedComponents,
  ]
    .flatMap(m => Object.values(m))
    .filter(
      (f): f is (cfg: {id: string}) => ProbedNode => typeof f === 'function',
    )
    .flatMap(factory => {
      try {
        // A LoadBalancer takes its subnets in its config; other factories ignore them.
        const node = factory({
          id: 'probe',
          subnets: [networkComponents.Subnet({id: 'probe-subnet'})],
        } as {id: string});
        return node?.state?.component ? [setEverything(node).state] : [];
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('no SETTER_VALUES')) {
          throw e;
        }
        return [];
      }
    })
    .map(state => [state.component, state]),
);

/**
 * Contract keys every declaring agent reads (or some agent requires), their
 * aliases, and the platform-owned key. A key only some of the agents of a
 * merged offer read does not count: the agent that reconciles the component
 * may be one that ignores it.
 */
const declaredKeys = (contract: OfferContract): Set<string> =>
  new Set([
    ...Object.entries(contract.params)
      .filter(
        ([, p]) =>
          p.agents === undefined || p.required || p.requiredBy !== undefined,
      )
      .map(([k]) => k),
    ...Object.values(contract.params).flatMap(p =>
      (p.aliases ?? []).map(a => a.key),
    ),
    'containerPlatform',
  ]);

/** Does the offer's rule refuse this neutral value? */
const refuses = (
  offer: OfferConstructor,
  key: string,
  value: unknown,
): boolean => {
  const rule = offer.neutral?.[key];
  if (rule === undefined) {
    return false;
  }
  if (rule.kind === 'unsupported') {
    return !rule.satisfiedBy?.(value);
  }
  try {
    rule.apply(value);
    return false;
  } catch {
    return true;
  }
};

/** The probed neutral parameters, without those the offer refuses. */
const supportedNeutral = (offer: OfferConstructor): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(NEUTRAL.get(offer.satisfies)?.parameters ?? {}).filter(
      ([k, v]) =>
        offer.neutral?.[k]?.kind !== 'unsupported' && !refuses(offer, k, v),
    ),
  );

const instantiateWith = (
  name: string,
  offer: OfferConstructor,
  parameters: Record<string, unknown>,
): LiveSystemComponent[] => {
  const neutral = NEUTRAL.get(offer.satisfies);
  const config = (SAMPLE_CONFIG[name] ?? {}) as never;
  return offer(config).instantiate({
    id: 'probe',
    displayName: 'probe',
    parameters,
    locked: [...(neutral?.locked ?? [])],
    dependencies: [],
    links: [],
    children: [],
  });
};

const emitted = (
  name: string,
  offer: OfferConstructor,
): LiveSystemComponent[] =>
  instantiateWith(name, offer, supportedNeutral(offer));

/** Keys each offer emits that the contract of the emitted type does not declare. */
const undeclaredParameters = (): Record<string, Record<string, string[]>> => {
  const out: Record<string, Record<string, string[]>> = {};
  for (const [name, offer] of OFFERS) {
    if (offer.contract === undefined) {
      continue;
    }
    for (const component of emitted(name, offer)) {
      const contract = CONTRACTS.get(component.type);
      if (contract === undefined) {
        continue;
      }
      const declared = declaredKeys(contract);
      const extra = Object.keys(component.parameters)
        .filter(k => !declared.has(k))
        .sort();
      if (extra.length > 0) {
        out[name] = {...out[name], [component.type]: extra};
      }
    }
  }
  return out;
};

describe('offers and the contracts their agents publish', () => {
  it('finds every offer of the catalogue', () => {
    expect(OFFERS.length).toBeGreaterThan(90);
  });

  it('defines every offer whose agent publishes a contract from that contract', () => {
    const withoutContract = OFFERS.filter(([, o]) => o.contract === undefined)
      .map(([name]) => name)
      .sort();
    expect(withoutContract).toEqual(Object.keys(UNPUBLISHED).sort());
    for (const [name, offer] of OFFERS) {
      if (offer.contract === undefined) {
        expect(
          CONTRACTS.has(offer.offerType),
          `${name}: ${offer.offerType} is published now; define the offer from its contract`,
        ).toBe(false);
      } else {
        expect(offer.offerType, name).toBe(offer.contract.offerType);
        expect(CONTRACTS.get(offer.offerType), name).toBe(offer.contract);
      }
    }
  });

  it('names a provider that declares the offer', () => {
    for (const [name, offer] of OFFERS) {
      const provider = offer({} as never).provider;
      if (offer.contract === undefined || provider === undefined) {
        continue;
      }
      expect(
        offer.contract.declaredBy.map(d => d.provider),
        name,
      ).toContain(provider);
    }
  });

  it('emits only contract keys, apart from the reasoned exceptions', () => {
    const pinned = JSON.parse(
      readFileSync('contracts/undeclared-parameters.json', 'utf8'),
    ) as {offers: Record<string, Record<string, Record<string, string>>>};
    const allowed = Object.fromEntries(
      Object.entries(pinned.offers).map(([offer, types]) => [
        offer,
        Object.fromEntries(
          Object.entries(types).map(([type, keys]) => {
            for (const [key, reason] of Object.entries(keys)) {
              expect(reason.trim(), `${offer} ${key}: a reason`).not.toBe('');
            }
            return [type, Object.keys(keys).sort()];
          }),
        ),
      ]),
    );
    const actual = undeclaredParameters();
    expect(
      actual,
      'An offer emits a key its agent does not declare. Give the neutral parameter ' +
        "a rule in the offer's `neutral` (translate it with toContractKey, or refuse " +
        'it with unsupported), or, only with a written reason, list it in ' +
        `contracts/undeclared-parameters.json:\n${JSON.stringify(actual, null, 2)}`,
    ).toEqual(allowed);
  });

  it('refuses every neutral parameter an offer cannot honor', () => {
    for (const [name, offer] of OFFERS) {
      const probed = NEUTRAL.get(offer.satisfies)?.parameters ?? {};
      for (const [key, rule] of Object.entries(offer.neutral ?? {})) {
        if (rule.kind !== 'unsupported' || !(key in probed)) {
          continue;
        }
        const run = () =>
          instantiateWith(name, offer, {
            ...supportedNeutral(offer),
            [key]: probed[key],
          });
        if (rule.satisfiedBy?.(probed[key])) {
          const emittedKeys = run().flatMap(c => Object.keys(c.parameters));
          expect(emittedKeys, `${name} ${key}`).not.toContain(key);
        } else {
          const quoted = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const setter = neutralSetterName(key);
          expect(run, `${name} ${key}`).toThrow(
            new RegExp(
              quoted(
                `Offer ${offer.offerType}, selected for 'probe', cannot honor ${setter} ('${key}'), a `,
              ) +
                '(guardrail locked|parameter open)' +
                quoted(
                  ` in the Fractal: ${rule.reason.replace(/\.$/, '')}. Fix: select an offer for 'probe' whose agent supports ${setter}, or `,
                ),
            ),
          );
        }
      }
    }
  });

  it('refuses the translations whose target value the agents would not take', () => {
    // A translation is refused, not sent, when the contract would not accept
    // its result: here because only the Java agents read retentionMs, and
    // aria-agent-caas-k8s may be the one reconciling the topic.
    const refused = OFFERS.flatMap(([name, offer]) =>
      Object.entries(NEUTRAL.get(offer.satisfies)?.parameters ?? {})
        .filter(
          ([k, v]) =>
            offer.neutral?.[k]?.kind === 'translate' && refuses(offer, k, v),
        )
        .map(([k]) => `${name}.${k}`),
    );
    expect(refused).toEqual([
      'CaaSSparkCluster.sparkVersion',
      'CaaSSparkJob.maxRetries',
      'KafkaTopic.messageRetentionHours',
    ]);
    const kafka = Object.fromEntries(OFFERS)['KafkaTopic'];
    expect(() =>
      instantiateWith('KafkaTopic', kafka, {messageRetentionHours: 24}),
    ).toThrow(
      "Offer Messaging.CaaS.KafkaTopic, selected for 'probe', cannot honor withMessageRetentionHours ('messageRetentionHours'), a guardrail locked in the Fractal: " +
        "'retentionMs' is read only by fractal-cloud-agent-aws, fractal-cloud-agent-azure, " +
        'fractal-cloud-agent-gcp, fractal-cloud-agent-oci; aria-agent-caas-k8s also reconciles ' +
        'Messaging.CaaS.KafkaTopic and ignores it.',
    );
  });

  it('has no rule for a key the contract declares', () => {
    for (const [name, offer] of OFFERS) {
      if (offer.contract === undefined) {
        continue;
      }
      // A deprecated alias may have one: it moves the value to the canonical key.
      const deprecated = new Set(
        Object.values(offer.contract.params as OfferContract['params']).flatMap(
          p => (p.aliases ?? []).filter(a => a.deprecated).map(a => a.key),
        ),
      );
      const stale = Object.keys(offer.neutral ?? {}).filter(
        k => declaredKeys(offer.contract!).has(k) && !deprecated.has(k),
      );
      expect(stale, `${name}: the agent reads these now`).toEqual([]);
    }
  });

  it('translates neutral parameters into the keys the agents read', () => {
    const vm = (name: string) => {
      const [c] = emitted(name, Object.fromEntries(OFFERS)[name]);
      return c.parameters;
    };
    // the neutral size vocabulary, in each vendor's machine types
    expect(vm('Ec2Instance')).toMatchObject({instanceType: 't3.small'});
    expect(vm('AzureVm')).toMatchObject({vmSize: 'Standard_B1ms'});
    expect(vm('GcpVm')).toMatchObject({machineType: 'e2-small'});
    expect(vm('OciInstance')).toMatchObject({shape: 'VM.Standard.E2.1.Micro'});
    expect(vm('AwsRdsPostgresDbms')).toMatchObject({
      version: '16',
      allocatedStorageGb: 32,
    });
    expect(vm('AwsLambda')).toMatchObject({memoryMb: 512, timeoutSeconds: 30});
    expect(vm('KafkaTopic')).toMatchObject({partitions: 2});
    expect(vm('AzureServiceBusTopic')).toMatchObject({
      defaultMessageTimeToLive: 'PT24H',
    });
    expect(vm('AzureContainerApp')).toMatchObject({
      minReplicas: 2,
      maxReplicas: 6,
      cpu: 0.25,
      memory: '0.5Gi',
    });
    expect(vm('CloudRun')).toMatchObject({
      image: 'registry/accounts:2.21.12',
      port: 8080,
      minInstances: 2,
      maxInstances: 6,
      cpu: '250m',
      memory: '512Mi',
    });
    expect(vm('AwsCloudFront')).toMatchObject({aliases: ['api.example.com']});
    expect(vm('AzureServiceBus')).not.toHaveProperty('tier');
  });

  it('emits an ECS workload as a task definition and the service that depends on it', () => {
    const ecs = Object.fromEntries(OFFERS)['EcsService'];
    const [task, service] = ecs({launchType: 'FARGATE'} as never).instantiate({
      id: 'web',
      displayName: 'web',
      parameters: {
        image: 'registry/app:1',
        port: 8080,
        replicas: 3,
        resources: {requests: {cpu: '500m', memory: '1Gi'}},
      },
      locked: [],
      dependencies: ['cluster', 'subnet'],
      links: [],
      children: [],
    });
    expect(task).toMatchObject({
      id: 'web-task',
      type: 'NetworkAndCompute.CaaS.ECSTaskDefinition',
      provider: 'AWS',
      parameters: {
        containerImage: 'registry/app:1',
        containerPort: 8080,
        cpu: '512',
        memory: '1024',
      },
      dependencies: [],
    });
    expect(service).toMatchObject({
      id: 'web',
      type: 'NetworkAndCompute.CaaS.ECSService',
      parameters: {desiredCount: 3, launchType: 'FARGATE'},
      dependencies: ['cluster', 'subnet', 'web-task'],
    });
    expect(
      Object.fromEntries(OFFERS)['EcsCluster']({} as never).offerType,
    ).toBe('NetworkAndCompute.PaaS.ECS');
  });

  it('refuses a neutral value no agent key can take', () => {
    const run = (name: string, parameters: Record<string, unknown>) =>
      instantiateWith(name, Object.fromEntries(OFFERS)[name], parameters);
    expect(() => run('Ec2Instance', {size: 'huge'})).toThrow(
      "Offer NetworkAndCompute.IaaS.AwsEc2Instance, selected for 'probe', cannot honor withSize ('size'), a guardrail locked in the Fractal: " +
        'size "huge" is neither a neutral size (small, medium, large, xlarge) nor a AWS machine type such as t3.micro.',
    );
    expect(run('Ec2Instance', {size: 'c7g.large'})[0].parameters).toEqual({
      instanceType: 'c7g.large',
    });
    expect(() => run('GcpVm', {size: 't3.micro'})).toThrow(
      /nor a GCP machine type/,
    );
    expect(() => run('AzureContainerApp', {memoryRequest: 'lots'})).toThrow(
      '"lots" is not a Kubernetes memory quantity such as 512Mi or 1Gi',
    );
    expect(
      run('AzureContainerApp', {memoryRequest: '1536Mi', cpuRequest: '1'})[0]
        .parameters,
    ).toMatchObject({
      memory: '1.5Gi',
      cpu: 1,
    });
    expect(() => run('AwsLambda', {memory: '512'})).toThrow(
      `(value withheld) is not the integer 'memoryMb' takes`,
    );
  });

  it('lets an explicit vendor value win over an open neutral one, never over a locked one', () => {
    const ec2 = Object.fromEntries(OFFERS)['Ec2Instance'];
    const run = (locked: string[]) =>
      ec2({instanceType: 't3.micro'} as never).instantiate({
        id: 'vm',
        displayName: 'vm',
        parameters: {size: 'small'},
        locked,
        dependencies: [],
        links: [],
        children: [],
      });
    expect(run([])[0].parameters).toEqual({instanceType: 't3.micro'});
    expect(() => run(['size'])).toThrow(
      "Parameter 'size' on 'vm' is a locked guardrail, and 'instanceType' sets the same thing",
    );
  });

  it('refuses a database parameter an RDS DBMS cannot honor on the databases it emits', () => {
    const dbms = Object.fromEntries(OFFERS)['AwsRdsPostgresDbms'];
    expect(() =>
      dbms({} as never).instantiate({
        id: 'db',
        displayName: 'db',
        parameters: {},
        dependencies: [],
        links: [],
        children: [
          {
            id: 'orders',
            displayName: 'orders',
            parameters: {charset: 'UTF8'},
            dependencies: [],
            links: [],
          },
        ],
      }),
    ).toThrow("selected for 'orders', cannot honor withCharset ('charset'), a parameter open in the Fractal");
  });

  it('never emits a former drift', () => {
    const lbs = ['AwsLb', 'AzureLb', 'GcpGlb'];
    for (const [name, offer] of OFFERS.filter(([n]) => lbs.includes(n))) {
      const [lb] = emitted(name, offer);
      expect(lb.parameters, name).not.toHaveProperty('scheme');
      expect(lb.parameters, name).toHaveProperty('lbScheme');
    }
    const oci = Object.fromEntries(OFFERS)['OciInstance'];
    const [vm] = emitted('OciInstance', oci);
    expect(vm.parameters).toHaveProperty('keyName');
    expect(vm.parameters).not.toHaveProperty('publicSSHKey');
  });
});
