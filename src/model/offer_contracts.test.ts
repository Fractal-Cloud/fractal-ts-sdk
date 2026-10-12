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
import {readFileSync, writeFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import * as apiManagementComponents from './components/api_management';
import * as bigDataComponents from './components/big_data';
import * as certificateManagerComponents from './components/certificate_manager';
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

type OfferConstructor = ((config: never) => Offer) & {
  readonly offerType: string;
  readonly satisfies: string;
  readonly contract?: OfferContract;
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
  OpenshiftPersistentVolume: 'aria-agent-openshift releases no contract',
  OpenshiftSecurityGroup: 'aria-agent-openshift releases no contract',
  OpenshiftService: 'aria-agent-openshift releases no contract',
  OpenshiftVm: 'aria-agent-openshift releases no contract',
  OpenshiftWorkload: 'aria-agent-openshift releases no contract',
  VspherePortGroup: 'aria-agent-vmware releases no contract',
  VsphereVlan: 'aria-agent-vmware releases no contract',
  VsphereVm: 'aria-agent-vmware releases no contract',
  Keycloak: 'no agent declares Security.CaaS.Keycloak',
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
    certificateManagerComponents,
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
        const node = factory({id: 'probe'});
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

/** Contract keys of `type`, its aliases, and the platform-owned key. */
const declaredKeys = (contract: OfferContract): Set<string> =>
  new Set([
    ...Object.keys(contract.params),
    ...Object.values(contract.params).flatMap(p =>
      (p.aliases ?? []).map(a => a.key),
    ),
    'containerPlatform',
  ]);

const emitted = (
  name: string,
  offer: OfferConstructor,
): LiveSystemComponent[] => {
  const neutral = NEUTRAL.get(offer.satisfies);
  const config = (SAMPLE_CONFIG[name] ?? {}) as never;
  return offer(config).instantiate({
    id: 'probe',
    displayName: 'probe',
    parameters: {...(neutral?.parameters ?? {})},
    locked: [...(neutral?.locked ?? [])],
    dependencies: [],
    links: [],
    children: [],
  });
};

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

const UNDECLARED_COMMENT =
  'Parameter keys the SDK emits that the contract of the emitted offer type does not ' +
  'declare, per offer, with every neutral setter of its component applied. Each is a ' +
  'neutral guardrail the agent ignores or a translation the SDK lacks. Pinned by ' +
  'src/model/offer_contracts.test.ts; regenerate with ' +
  'UPDATE_UNDECLARED_PARAMETERS=1 npx vitest run src/model/offer_contracts.test.ts ' +
  'and review the diff. See docs/offer-contracts.md.';

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

  it('emits only contract keys, apart from the pinned inventory of undeclared ones', () => {
    const file = 'contracts/undeclared-parameters.json';
    const actual = undeclaredParameters();
    if (process.env.UPDATE_UNDECLARED_PARAMETERS === '1') {
      writeFileSync(
        file,
        `${JSON.stringify({$comment: UNDECLARED_COMMENT, offers: actual}, null, 2)}\n`,
      );
    }
    const pinned = JSON.parse(readFileSync(file, 'utf8')) as {
      offers: Record<string, Record<string, string[]>>;
    };
    expect(
      actual,
      'An offer emits a key its agent does not declare. Translate it to the ' +
        'contract key (see LoadBalancer scheme → lbScheme), or, if it is a ' +
        'neutral guardrail the agent genuinely does not read yet, add it to ' +
        `contracts/undeclared-parameters.json:\n${JSON.stringify(actual, null, 2)}`,
    ).toEqual(pinned.offers);
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
