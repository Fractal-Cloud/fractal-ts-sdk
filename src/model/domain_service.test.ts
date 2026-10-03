/**
 * domain_service.test.ts — the Domain Service fractal of the shared AWS
 * platform, end to end, as the platform repository builds it.
 *
 * The fractal itself lives outside this SDK; this proves the SDK can express
 * all of it and pins the body the control plane receives:
 *   - `service`  a Kubernetes workload (caas-k8s) on the SHARED cluster;
 *   - `cluster`  a reference to the platform's EKS;
 *   - `dbms`     a reference to the platform's RDS for PostgreSQL;
 *   - `database` this service's database on that DBMS;
 *   - `events`   this service's SNS topic;
 *   - `subscriptions[]` one SQS queue per upstream service, each subscribed
 *               to a reference to that service's topic;
 *   - `gateway`  a reference to the platform's Traefik, routed to by an
 *               outbound link from the workload.
 * Ops fix the structure and the rollout, disruption, spread and probe
 * guardrails; the app team sets image, env, secrets, resources, scaling,
 * drain and routes through the Interface.
 */
import {describe, it, expect, beforeEach, vi} from 'vitest';

const h = vi.hoisted(() => {
  const requests: {method: string; url: string; body?: unknown}[] = [];
  const state = {queue: [] as {status: number; body?: unknown}[]};
  return {requests, state};
});

vi.mock('superagent', () => {
  const make = (method: string, url: string) => {
    const req: Record<string, unknown> = {body: undefined};
    req.ok = () => req;
    req.set = () => req;
    req.send = (b: unknown) => {
      req.body = b;
      return req;
    };
    req.then = (
      resolve: (v: unknown) => unknown,
      reject: (e: unknown) => unknown,
    ) => {
      h.requests.push({method, url, body: req.body});
      const next = h.state.queue.shift() ?? {status: 200, body: {}};
      return Promise.resolve(next).then(resolve, reject);
    };
    return req;
  };
  return {
    default: {
      get: (u: string) => make('GET', u),
      post: (u: string) => make('POST', u),
      put: (u: string) => make('PUT', u),
      delete: (u: string) => make('DELETE', u),
    },
  };
});

import {createFractal} from './core';
import type {AnyNode, Offer, OwnerRef} from './core';
import {ApiGateway} from './components/api_management';
import {Workload} from './components/custom_workloads';
import {MessagingEntity} from './components/messaging';
import type {MessagingEntityLink} from './components/messaging_entity_link';
import {ContainerPlatform} from './components/network_and_compute';
import {RelationalDbms, RelationalDatabase} from './components/storage';
import type {RelationalDatabaseLink} from './components/storage';
import {gatewayRouteSettings} from './components/gateway_route_settings';
import type {GatewayRouteOptions} from './components/gateway_route_options';
import type {WorkloadResources} from './components/workload/workload_resources';
import {TraefikGateway} from './offers/api_management';
import {K8sWorkload} from './offers/custom_workloads';
import {AwsSnsTopic, AwsSqsQueue} from './offers/messaging';
import {Eks} from './offers/network_and_compute';
import {AwsRdsPostgresDbms, AwsRdsPostgresDatabase} from './offers/storage';
import {referenceTo, liveSystemIdOf} from './reference';
import {secretRef} from './secret';
import type {SecretRef} from './secret';
import {createFractalCloudClient} from './client';

const ORG = '00000000-0000-0000-0000-00000000f00d';
const PLATFORM_BC: OwnerRef = {ownerType: 'Organizational', ownerId: ORG, name: 'platform'};
const ACCOUNTS_BC: OwnerRef = {ownerType: 'Organizational', ownerId: ORG, name: 'accounts'};
const ORGANIZATIONS_BC: OwnerRef = {
  ownerType: 'Organizational',
  ownerId: ORG,
  name: 'organizations',
};
const PLATFORM_LS = liveSystemIdOf(PLATFORM_BC, 'shared-platform');
const ORGANIZATIONS_LS = liveSystemIdOf(ORGANIZATIONS_BC, 'organizations');
const environment = {ownerType: 'Organizational', ownerId: ORG, name: 'fractal-cloud-prod'};

type Subscription = {
  /** The upstream Domain Service, i.e. its Live System. */
  liveSystemId: string;
  /** Short name used in this service's slot ids. */
  name: string;
  eventNames: string[];
};

/** The Domain Service fractal, as the platform repository would define it. */
const domainService = (subscriptions: Subscription[]) =>
  createFractal({
    id: 'domain-service',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId: ACCOUNTS_BC,
    blueprint: bp => {
      const cluster = bp.add(ContainerPlatform({id: 'cluster'}));
      const dbms = bp.add(RelationalDbms({id: 'dbms'}));
      const gateway = bp.add(ApiGateway({id: 'gateway'}));
      const database = bp.add(RelationalDatabase({id: 'database'}).dependsOn(dbms));
      const events = bp.add(MessagingEntity({id: 'events'}));
      // Ops-fixed guardrails: surge rollout, PDB, spread, probes, Graviton.
      const service = bp.add(
        Workload({id: 'service'})
          .withPort(8080)
          .withRollout({maxSurge: 1, maxUnavailable: 0})
          .withPodDisruptionBudget({minAvailable: 1})
          .withTopologySpread(true)
          .withReadinessProbe({path: '/health/ready'})
          .withLivenessProbe({path: '/health/live'})
          .withNodeSelector({'kubernetes.io/arch': 'arm64'})
          .dependsOn(cluster),
      );
      bp.link(service, database, {access: 'read-write'} satisfies RelationalDatabaseLink);
      bp.link(service, events, {access: 'publish'} satisfies MessagingEntityLink);
      const slots: Record<string, AnyNode> = {cluster, dbms, gateway, database, events, service};
      for (const sub of subscriptions) {
        const upstream = bp.add(MessagingEntity({id: `${sub.name}-events`}));
        const inbox = bp.add(MessagingEntity({id: `${sub.name}-inbox`}).withTopic(upstream));
        bp.link(service, inbox, {access: 'subscribe'} satisfies MessagingEntityLink);
        slots[upstream.state.id] = upstream;
        slots[inbox.state.id] = inbox;
      }
      return slots;
    },
    operations: (s, ctx) => ({
      withImage: (repo: string, tag: string) => s.service.set('image', `${repo}:${tag}`),
      withEnv: (env: Record<string, string>) => s.service.set('env', env),
      withSecretEnv: (env: Record<string, SecretRef>) => s.service.set('secretEnv', env),
      withResources: (r: WorkloadResources) => s.service.set('resources', r),
      withAutoscaling: (min: number, max: number, cpu: number) =>
        s.service.set('autoscaling', {minReplicas: min, maxReplicas: max, targetCpuUtilization: cpu}),
      withDrain: (seconds: number) => s.service.set('terminationGracePeriodSeconds', seconds),
      withRoutes: (routes: GatewayRouteOptions) =>
        ctx.link(s.service, s.gateway, gatewayRouteSettings(routes)),
    }),
  });

const selection = (subscriptions: Subscription[]): Record<string, Offer> => {
  const select: Record<string, Offer> = {
    cluster: referenceTo(Eks, {liveSystemId: PLATFORM_LS, componentId: 'eks'}),
    dbms: referenceTo(AwsRdsPostgresDbms, {liveSystemId: PLATFORM_LS, componentId: 'postgres'}),
    gateway: referenceTo(TraefikGateway, {liveSystemId: PLATFORM_LS, componentId: 'traefik'}),
    database: AwsRdsPostgresDatabase({databaseName: 'fractal_accounts'}),
    events: AwsSnsTopic({topicName: 'fractal-accounts'}),
    service: K8sWorkload({namespace: 'fractal'}),
  };
  for (const sub of subscriptions) {
    select[`${sub.name}-events`] = referenceTo(AwsSnsTopic, {
      liveSystemId: sub.liveSystemId,
      componentId: 'events',
    });
    select[`${sub.name}-inbox`] = AwsSqsQueue({
      queueName: `fractal-${sub.name}-accounts`,
      filterEventNames: sub.eventNames,
    });
  }
  return select;
};

const SUBSCRIPTIONS: Subscription[] = [
  {
    liveSystemId: ORGANIZATIONS_LS,
    name: 'organizations',
    eventNames: ['OrganizationCreated', 'OrganizationDeleted'],
  },
];

const accountsLiveSystem = () =>
  domainService(SUBSCRIPTIONS)
    .specialize()
    .withImage('ghcr.io/fractal-cloud/accounts', 'v2.21.12')
    .withEnv({ASPNETCORE_ENVIRONMENT: 'Production'})
    .withSecretEnv({SENDGRID_API_KEY: secretRef('sendgrid-api-key')})
    .withResources({requests: {cpu: '250m', memory: '512Mi'}, limits: {memory: '1Gi'}})
    .withAutoscaling(2, 6, 70)
    .withDrain(60)
    .withRoutes({
      routes: [
        {prefix: '/accounts'},
        {prefix: '/swagger/accounts', rewritePath: '/swagger/v1.0/swagger.json'},
      ],
      responseTimeoutMs: 60000,
      retryAttempts: 2,
    })
    // The typed selection is keyed by literal slot ids; this fractal's slots are
    // built from data, so its selection is a plain record.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .toLiveSystem({name: 'accounts', environment, select: selection(SUBSCRIPTIONS) as any});

const cloud = createFractalCloudClient({clientId: 'cid', clientSecret: 'secret'});

describe('the Domain Service fractal on the shared AWS platform', () => {
  beforeEach(() => {
    h.requests.length = 0;
    h.state.queue = [];
  });

  it('deploys a body with references to the platform and to the upstream topic', async () => {
    h.state.queue = [{status: 404}, {status: 201}];
    await cloud.liveSystems.deploy(accountsLiveSystem());
    const post = h.requests.find(r => r.method === 'POST')!;
    const body = post.body as {
      liveSystemId: string;
      fractalId: string;
      blueprintMap: Record<string, unknown>;
    };
    expect(body.liveSystemId).toBe(`Organizational/${ORG}/accounts/accounts`);
    expect(body.fractalId).toBe(`Organizational/${ORG}/accounts/domain-service:1.0.0`);
    expect(body.blueprintMap).toEqual({
      cluster: {
        type: 'NetworkAndCompute.PaaS.AwsEks',
        id: 'cluster',
        displayName: 'cluster',
        provider: 'AWS',
        deliveryModel: 'PaaS',
        reference: {liveSystemId: `Organizational/${ORG}/platform/shared-platform`, componentId: 'eks'},
        parameters: {},
        dependencies: [],
        links: [],
      },
      dbms: {
        type: 'Storage.PaaS.AwsRdsPostgres',
        id: 'dbms',
        displayName: 'dbms',
        provider: 'AWS',
        deliveryModel: 'PaaS',
        reference: {liveSystemId: `Organizational/${ORG}/platform/shared-platform`, componentId: 'postgres'},
        parameters: {},
        dependencies: [],
        links: [],
      },
      gateway: {
        type: 'APIManagement.CaaS.TraefikGateway',
        id: 'gateway',
        displayName: 'gateway',
        provider: undefined,
        deliveryModel: 'CaaS',
        reference: {liveSystemId: `Organizational/${ORG}/platform/shared-platform`, componentId: 'traefik'},
        parameters: {},
        dependencies: [],
        links: [],
      },
      database: {
        type: 'Storage.PaaS.AwsRdsPostgresDatabase',
        id: 'database',
        displayName: 'database',
        provider: 'AWS',
        deliveryModel: 'PaaS',
        parameters: {databaseName: 'fractal_accounts'},
        dependencies: ['dbms'],
        links: [],
      },
      events: {
        type: 'Messaging.PaaS.AwsSnsTopic',
        id: 'events',
        displayName: 'events',
        provider: 'AWS',
        deliveryModel: 'PaaS',
        parameters: {topicName: 'fractal-accounts'},
        dependencies: [],
        links: [],
      },
      service: {
        type: 'CustomWorkloads.CaaS.KubernetesWorkload',
        id: 'service',
        displayName: 'service',
        provider: undefined,
        deliveryModel: 'CaaS',
        parameters: {
          namespace: 'fractal',
          containerImage: 'ghcr.io/fractal-cloud/accounts:v2.21.12',
          containerPort: 8080,
          maxSurge: 1,
          maxUnavailable: 0,
          podDisruptionBudget: {minAvailable: 1},
          topologySpread: true,
          readinessProbe: {path: '/health/ready'},
          livenessProbe: {path: '/health/live'},
          nodeSelector: {'kubernetes.io/arch': 'arm64'},
          env: {ASPNETCORE_ENVIRONMENT: 'Production'},
          secretEnv: {SENDGRID_API_KEY: {$envSecret: 'sendgrid-api-key'}},
          resourceRequests: {cpu: '250m', memory: '512Mi'},
          resourceLimits: {memory: '1Gi'},
          autoscaling: {minReplicas: 2, maxReplicas: 6, targetCpuUtilization: 70},
          terminationGracePeriodSeconds: 60,
        },
        dependencies: ['cluster'],
        links: [
          {componentId: 'database', settings: {access: 'read-write'}},
          {componentId: 'events', settings: {access: 'publish'}},
          {componentId: 'organizations-inbox', settings: {access: 'subscribe'}},
          {
            componentId: 'gateway',
            settings: {
              'routes.0.prefix': '/accounts',
              'routes.1.prefix': '/swagger/accounts',
              'routes.1.rewritePath': '/swagger/v1.0/swagger.json',
              responseTimeoutMs: '60000',
              retryAttempts: '2',
            },
          },
        ],
      },
      'organizations-events': {
        type: 'Messaging.PaaS.AwsSnsTopic',
        id: 'organizations-events',
        displayName: 'organizations-events',
        provider: 'AWS',
        deliveryModel: 'PaaS',
        reference: {
          liveSystemId: `Organizational/${ORG}/organizations/organizations`,
          componentId: 'events',
        },
        parameters: {},
        dependencies: [],
        links: [],
      },
      'organizations-inbox': {
        type: 'Messaging.PaaS.AwsSqsQueue',
        id: 'organizations-inbox',
        displayName: 'organizations-inbox',
        provider: 'AWS',
        deliveryModel: 'PaaS',
        parameters: {
          queueName: 'fractal-organizations-accounts',
          filterEventNames: 'OrganizationCreated,OrganizationDeleted',
        },
        dependencies: ['organizations-events'],
        links: [],
      },
    });
  });

  it('refuses the app team overriding an ops-fixed guardrail', () => {
    const f = createFractal({
      id: 'x',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId: ACCOUNTS_BC,
      blueprint: bp => ({
        service: bp.add(Workload({id: 'service'}).withPodDisruptionBudget({minAvailable: 1})),
      }),
      operations: s => ({
        withoutPdb: () => s.service.set('podDisruptionBudget', {minAvailable: 0}),
      }),
    });
    expect(() => f.specialize().withoutPdb()).toThrow(/locked guardrail/);
  });
});
