/**
 * kubernetes_workload_params.test.ts — executable spec for the Workload
 * parameters a Kubernetes workload (caas-k8s) reads.
 *
 * The neutral `Workload` setters keep their names; the `K8sWorkload` offer (and
 * a Workload added under a ContainerPlatform) emits the caas-k8s canonical
 * names: `port` → `containerPort`, `cpuRequest`/`memoryRequest`/`resources` →
 * `resourceRequests`/`resourceLimits`, `maxReplicas` → `autoscaling`,
 * `healthCheck` → `readinessProbe` + `livenessProbe`. The new rollout, drain, disruption, probe,
 * spread and secret-env parameters travel under their own names. Literals on
 * purpose: they pin the wire contract.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import type {LiveSystemComponent} from './core';
import {Workload} from './components/custom_workloads';
import type {WorkloadNode} from './components/custom_workloads';
import {ContainerPlatform} from './components/network_and_compute';
import {K8sWorkload} from './offers/custom_workloads';
import {Eks} from './offers/network_and_compute';
import {KUBERNETES_WORKLOAD_CONTRACT_PARAMS} from './offers/kubernetes_workload_contract';
import {secretRef} from './secret';

const environment = {};
const boundedContextId = {name: 'workloads'};

const emit = (
  author: (w: WorkloadNode<'web'>) => WorkloadNode<'web'>,
  set: Record<string, unknown> = {},
  offer: Parameters<typeof K8sWorkload>[0] = {},
): LiveSystemComponent =>
  createFractal({
    id: 'k8s-params',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => ({web: bp.add(author(Workload({id: 'web'})))}),
    operations: s => ({
      apply: () => (st: Parameters<ReturnType<typeof s.web.set>>[0]) =>
        Object.entries(set).reduce((acc, [k, v]) => s.web.set(k, v)(acc), st),
    }),
  })
    .specialize()
    .apply()
    .toLiveSystem({
      name: 'ls',
      environment,
      select: {web: K8sWorkload({namespace: 'fractal', ...offer})},
    })
    .components.find(c => c.id === 'web')!;

const everySetter = (w: WorkloadNode<'web'>) =>
  w
    .withImage('registry/accounts:2.21.12')
    .withPort(8080)
    .withReplicas(2)
    .withEnv({LOG_LEVEL: 'info'})
    .withSecretEnv({DB_PASSWORD: secretRef('accounts-db-password')})
    .withResources({
      requests: {cpu: '250m', memory: '512Mi'},
      limits: {cpu: '1', memory: '1Gi'},
    })
    .withAutoscaling({minReplicas: 2, maxReplicas: 6, targetCpuUtilization: 70})
    .withPodDisruptionBudget({minAvailable: 1})
    .withRollout({maxSurge: 1, maxUnavailable: 0})
    .withTerminationGracePeriodSeconds(90)
    .withPreStopSleepSeconds(10)
    .withReadinessProbe({path: '/health/ready', port: 8080, periodSeconds: 5})
    .withLivenessProbe({path: '/health/live', initialDelaySeconds: 30})
    .withStartupProbe({path: '/health/started', failureThreshold: 30})
    .withTopologySpread(true)
    .withNodeSelector({'kubernetes.io/arch': 'arm64'});

describe('Workload parameters on a Kubernetes workload', () => {
  it('emits every setter under its caas-k8s canonical name', () => {
    const web = emit(everySetter);
    expect(web.parameters).toEqual({
      namespace: 'fractal',
      containerImage: 'registry/accounts:2.21.12',
      containerPort: 8080,
      replicas: 2,
      env: {LOG_LEVEL: 'info'},
      secretEnv: {DB_PASSWORD: {$envSecret: 'accounts-db-password'}},
      resourceRequests: {cpu: '250m', memory: '512Mi'},
      resourceLimits: {cpu: '1', memory: '1Gi'},
      autoscaling: {minReplicas: 2, maxReplicas: 6, targetCpuUtilization: 70},
      podDisruptionBudget: {minAvailable: 1},
      maxSurge: 1,
      maxUnavailable: 0,
      terminationGracePeriodSeconds: 90,
      preStopSleepSeconds: 10,
      readinessProbe: {path: '/health/ready', port: 8080, periodSeconds: 5},
      livenessProbe: {path: '/health/live', initialDelaySeconds: 30},
      startupProbe: {path: '/health/started', failureThreshold: 30},
      topologySpread: true,
      nodeSelector: {'kubernetes.io/arch': 'arm64'},
    });
  });

  it('emits nothing the transcribed caas-k8s contract does not declare', () => {
    const web = emit(everySetter);
    const declared = new Set<string>(KUBERNETES_WORKLOAD_CONTRACT_PARAMS);
    expect(Object.keys(web.parameters).filter(k => !declared.has(k))).toEqual(
      [],
    );
  });

  it('maps the older setters onto the canonical names', () => {
    const web = emit(w =>
      w
        .withPort(9090)
        .withCpuRequest('500m')
        .withMemoryRequest('256Mi')
        .withMaxReplicas(20)
        .withHealthCheck({path: '/healthz', port: 9090}),
    );
    expect(web.parameters).toEqual({
      namespace: 'fractal',
      containerPort: 9090,
      resourceRequests: {cpu: '500m', memory: '256Mi'},
      autoscaling: {maxReplicas: 20},
      readinessProbe: {path: '/healthz', port: 9090},
      livenessProbe: {path: '/healthz', port: 9090},
    });
  });

  it('lets an explicit canonical value win over a dev-open neutral one', () => {
    const web = emit(w => w, {port: 80, containerPort: 8080});
    expect(web.parameters.containerPort).toBe(8080);
    expect(web.parameters.port).toBeUndefined();
  });

  it.each([
    [
      'port',
      (w: WorkloadNode<'web'>) => w.withPort(80),
      {containerPort: 8080},
      /'port'.*'containerPort'/,
    ],
    [
      'cpuRequest',
      (w: WorkloadNode<'web'>) => w.withCpuRequest('500m'),
      {resourceRequests: {cpu: '1'}},
      /'cpuRequest'.*'resourceRequests'/,
    ],
    [
      'maxReplicas',
      (w: WorkloadNode<'web'>) => w.withMaxReplicas(10),
      {autoscaling: {maxReplicas: 3}},
      /'maxReplicas'.*'autoscaling'/,
    ],
    [
      'healthCheck',
      (w: WorkloadNode<'web'>) => w.withHealthCheck({path: '/a', port: 1}),
      {readinessProbe: {path: '/b'}},
      /'healthCheck'.*'readinessProbe'/,
    ],
    [
      'healthCheck (liveness)',
      (w: WorkloadNode<'web'>) => w.withHealthCheck({path: '/a', port: 1}),
      {livenessProbe: {path: '/b'}},
      /'healthCheck'.*'livenessProbe'/,
    ],
  ])(
    'refuses a canonical %s override of a LOCKED neutral guardrail',
    (_name, author, set, reason) => {
      expect(() => emit(author, set)).toThrow(reason);
    },
  );

  it('merges withResources over the older cpuRequest / memoryRequest', () => {
    const web = emit(w =>
      w.withCpuRequest('100m').withResources({requests: {memory: '1Gi'}}),
    );
    expect(web.parameters.resourceRequests).toEqual({
      cpu: '100m',
      memory: '1Gi',
    });
  });

  it('refuses a raw value in secretEnv: only environment-secret references travel', () => {
    expect(() => emit(w => w, {secretEnv: {DB_PASSWORD: 'hunter2'}})).toThrow(
      /secretEnv 'DB_PASSWORD' on 'web' is not an environment-secret reference/,
    );
  });

  it('never echoes the raw secret value in the refusal', () => {
    try {
      emit(w => w, {secretEnv: {DB_PASSWORD: 'hunter2'}});
      expect.unreachable();
    } catch (err) {
      expect((err as Error).message).not.toContain('hunter2');
    }
  });

  it('moves an environment-secret reference in env to secretEnv, where the agent resolves it', () => {
    const web = emit(w => w, {
      env: {LOG_LEVEL: 'info', TOKEN: secretRef('t')},
      secretEnv: {DB_PASSWORD: secretRef('db')},
    });
    expect(web.parameters.env).toEqual({LOG_LEVEL: 'info'});
    expect(web.parameters.secretEnv).toEqual({
      DB_PASSWORD: {$envSecret: 'db'},
      TOKEN: {$envSecret: 't'},
    });
  });

  it('refuses a name both in env (as a reference) and in secretEnv', () => {
    expect(() =>
      emit(w => w, {env: {TOKEN: secretRef('t')}, secretEnv: {TOKEN: secretRef('u')}}),
    ).toThrow(/'TOKEN' on 'web' is in both env and secretEnv/);
  });

  it.each([
    [
      'minReplicas above maxReplicas',
      {autoscaling: {minReplicas: 5, maxReplicas: 2}},
      /autoscaling/,
    ],
    [
      'a CPU target of 0',
      {autoscaling: {maxReplicas: 2, targetCpuUtilization: 0}},
      /targetCpuUtilization/,
    ],
    [
      'a negative grace period',
      {terminationGracePeriodSeconds: -1},
      /terminationGracePeriodSeconds/,
    ],
    [
      'a preStop sleep not shorter than the grace period',
      {terminationGracePeriodSeconds: 10, preStopSleepSeconds: 10},
      /preStopSleepSeconds/,
    ],
    [
      'a probe path without a leading slash',
      {readinessProbe: {path: 'health'}},
      /readinessProbe/,
    ],
    [
      'maxSurge and maxUnavailable both 0',
      {maxSurge: 0, maxUnavailable: 0},
      /maxSurge/,
    ],
    [
      'maxSurge and maxUnavailable both zero, one as a percentage',
      {maxSurge: '0%', maxUnavailable: 0},
      /maxSurge/,
    ],
    ['a rollout pace that is neither a count nor a percentage', {maxSurge: 'lots'}, /maxSurge/],
    ['a percentage above 100', {maxUnavailable: '150%'}, /maxUnavailable/],
  ])('refuses %s', (_why, set, reason) => {
    expect(() => emit(w => w, set)).toThrow(reason);
  });

  it('accepts the rollout pace as a percentage', () => {
    const web = emit(w => w.withRollout({maxSurge: '25%', maxUnavailable: '0%'}));
    expect(web.parameters).toMatchObject({maxSurge: '25%', maxUnavailable: '0%'});
  });

  it('applies the same translation to a Workload added under a ContainerPlatform', () => {
    const child = createFractal({
      id: 'k8s-child',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({
        platform: bp.add(ContainerPlatform({id: 'platform'})),
      }),
      operations: s => ({
        add: () =>
          s.platform.addChild(
            Workload({id: 'orders'}).withPort(8080).withCpuRequest('200m'),
          ),
      }),
    })
      .specialize()
      .add()
      .toLiveSystem({name: 'ls', environment, select: {platform: Eks({})}})
      .components.find(c => c.id === 'orders')!;
    expect(child.parameters).toEqual({
      containerPort: 8080,
      resourceRequests: {cpu: '200m'},
    });
  });
  it('emits replicas 0: the agent scales the workload to zero', () => {
    const web = emit(w => w.withReplicas(0));
    expect(web.parameters.replicas).toBe(0);
  });

  it('accepts replicas 0 with an autoscaling minReplicas of its own', () => {
    const web = emit(w =>
      w.withReplicas(0).withAutoscaling({minReplicas: 1, maxReplicas: 3}),
    );
    expect(web.parameters).toMatchObject({
      replicas: 0,
      autoscaling: {minReplicas: 1, maxReplicas: 3},
    });
  });

  it.each([
    ['withAutoscaling', (w: WorkloadNode<'web'>) => w.withAutoscaling({maxReplicas: 5})],
    ['withMaxReplicas', (w: WorkloadNode<'web'>) => w.withMaxReplicas(5)],
  ])(
    'refuses replicas 0 with autoscaling from %s and no minReplicas: an HPA cannot scale to zero',
    (_name, author) => {
      expect(() => emit(w => author(w.withReplicas(0)))).toThrow(
        /replicas 0.*autoscaling/,
      );
    },
  );

  const sesIdentity = 'arn:aws:ses:eu-central-1:111122223333:identity/fractal.cloud';
  const kmsKey =
    'arn:aws:kms:eu-central-1:111122223333:key/0123abcd-4567-89ef-0123-456789abcdef';

  it('emits ssmParameters and sesIdentityArns from the offer under the names the agent reads', () => {
    const web = emit(w => w, {}, {
      ssmParameters: {service: 'accounts', access: 'read-write', kmsKeyArn: kmsKey},
      sesIdentityArns: [sesIdentity],
    });
    expect(web.parameters).toMatchObject({
      ssmParameters: {service: 'accounts', access: 'read-write', kmsKeyArn: kmsKey},
      sesIdentityArns: [sesIdentity],
    });
    const declared = new Set<string>(KUBERNETES_WORKLOAD_CONTRACT_PARAMS);
    expect(Object.keys(web.parameters).filter(k => !declared.has(k))).toEqual(
      [],
    );
  });

  it('accepts ssmParameters without a kmsKeyArn (the AWS-managed aws/ssm key)', () => {
    const web = emit(w => w, {ssmParameters: {service: 'accounts', access: 'read'}});
    expect(web.parameters.ssmParameters).toEqual({service: 'accounts', access: 'read'});
  });

  it.each([
    ['an ssmParameters service that is not one path segment', {ssmParameters: {service: 'a/b', access: 'read'}}, /ssmParameters.service/],
    ['an ssmParameters service of ..', {ssmParameters: {service: '..', access: 'read'}}, /ssmParameters.service/],
    ['an ssmParameters without a service', {ssmParameters: {access: 'read'}}, /ssmParameters.service/],
    ['an ssmParameters access besides read and read-write', {ssmParameters: {service: 'accounts', access: 'write'}}, /ssmParameters.access/],
    ['an ssmParameters kmsKeyArn that is an alias', {ssmParameters: {service: 'accounts', access: 'read', kmsKeyArn: 'arn:aws:kms:eu-central-1:111122223333:alias/aws/ssm'}}, /ssmParameters.kmsKeyArn/],
    ['an ssmParameters that is not an object', {ssmParameters: 'accounts'}, /ssmParameters/],
    ['a sesIdentityArns that is not a list', {sesIdentityArns: sesIdentity}, /sesIdentityArns/],
    ['a wildcard SES identity', {sesIdentityArns: ['arn:aws:ses:eu-central-1:111122223333:identity/*']}, /sesIdentityArns/],
    ['a SES ARN that is not an identity', {sesIdentityArns: ['arn:aws:ses:eu-central-1:111122223333:configuration-set/x']}, /sesIdentityArns/],
  ])('refuses %s', (_why, set, reason) => {
    expect(() => emit(w => w, set)).toThrow(reason);
  });
});
