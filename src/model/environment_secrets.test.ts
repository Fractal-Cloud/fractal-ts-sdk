/**
 * environment_secrets.test.ts — selecting the environment secrets a component
 * may access (`withEnvironmentSecrets`), and a workload's `env` / `secretEnv`
 * on the offers whose agents read a container `environment`.
 */
import {describe, expect, it} from 'vitest';
import {createFractal} from './core';
import {Function, Workload} from './components/custom_workloads';
import {
  ForgetfulSecretReader,
  PlainFunction,
  SecretReader,
} from './offers/contract/fixtures/secret_access_offers';
import {CloudRun, EcsService, K8sWorkload} from './offers/custom_workloads';
import {isSecretRef, secretRef} from './secret';
import type {OfferContract} from './offers/contract/offer_contract';
import {
  NetworkAndCompute_CaaS_ECSService,
  NetworkAndCompute_CaaS_ECSTaskDefinition,
} from './offers/generated/network_and_compute';

const boundedContextId = {id: 'secrets'};
const environment = {};

const functionFractal = () =>
  createFractal({
    id: 'fn',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => ({fn: bp.add(Function({id: 'fn'}))}),
  });

describe('withEnvironmentSecrets', () => {
  it('sends the selection as the environmentSecretShortNames parameter', () => {
    const ls = functionFractal().toLiveSystem({
      name: 'ls',
      environment,
      select: {
        fn: SecretReader({handler: 'main'}).withEnvironmentSecrets([
          'db-password',
          'api-key',
        ]),
      },
    });
    expect(ls.components[0].parameters).toEqual({
      handler: 'main',
      environmentSecretShortNames: ['db-password', 'api-key'],
    });
  });

  it('replaces an earlier selection', () => {
    const offer = SecretReader({})
      .withEnvironmentSecrets(['a'])
      .withEnvironmentSecrets(['b']);
    expect(offer.config).toEqual({environmentSecretShortNames: ['b']});
  });

  it('refuses a blank or repeated short name without echoing it', () => {
    const refusal = (f: () => unknown): string => {
      try {
        f();
      } catch (e) {
        return (e as Error).message;
      }
      throw new Error('not refused');
    };
    const blank = refusal(() =>
      SecretReader({}).withEnvironmentSecrets(['ok', {raw: 'hunter2'} as never]),
    );
    expect(blank).not.toContain('hunter2');
    const repeated = refusal(() =>
      SecretReader({}).withEnvironmentSecrets(['hunter2', 'hunter2']),
    );
    expect(repeated).toBe(
      'CustomWorkloads.FaaS.SecretReader environmentSecretShortNames: items 0 ' +
        'and 1 name the same secret (value withheld).',
    );
    expect(
      refusal(() => SecretReader({}).withEnvironmentSecrets(['a', ' '])),
    ).toBe(
      'CustomWorkloads.FaaS.SecretReader environmentSecretShortNames: item 1 ' +
        'is not an environment-secret short name (value withheld).',
    );
  });

  it('checks the raw config key as the method does', () => {
    expect(() =>
      SecretReader({environmentSecretShortNames: ['a', 'a']}),
    ).toThrow('items 0 and 1 name the same secret');
    expect(() =>
      SecretReader({environmentSecretShortNames: 'a' as never}),
    ).toThrow('takes a list of environment-secret short names');
  });

  it('is only on an offer whose contract can access secrets', () => {
    const plain = PlainFunction({});
    expect('withEnvironmentSecrets' in plain).toBe(false);
    const flagged = SecretReader({});
    expect('withEnvironmentSecrets' in flagged).toBe(true);
    expect(flagged.withEnvironmentSecrets(['a']).config).toEqual({
      environmentSecretShortNames: ['a'],
    });
  });

  it('refuses the raw config key on an offer that cannot access secrets', () => {
    expect(() =>
      PlainFunction({environmentSecretShortNames: ['a']} as never),
    ).toThrow(
      'CustomWorkloads.FaaS.Plain cannot access environment secrets: its ' +
        'contract publishes no canAccessSecrets',
    );
  });

  it('EcsService: its two contracts agree on secret access', () => {
    // EcsService takes its config from both contracts but gates at runtime on
    // the service's: a release flagging one only would split the type gate
    // from the runtime one.
    expect(
      (NetworkAndCompute_CaaS_ECSService as OfferContract).canAccessSecrets,
    ).toBe(
      (NetworkAndCompute_CaaS_ECSTaskDefinition as OfferContract)
        .canAccessSecrets,
    );
  });

  it('reaches the agent through the shipped offers that build their own components', () => {
    const fractal = workloadFractal({});
    const k8s = fractal.toLiveSystem({
      name: 'ls',
      environment,
      select: {web: K8sWorkload({}).withEnvironmentSecrets(['db-password'])},
    });
    expect(k8s.components[0].parameters.environmentSecretShortNames).toEqual([
      'db-password',
    ]);
    const ecs = fractal.toLiveSystem({
      name: 'ls',
      environment,
      select: {web: EcsService({}).withEnvironmentSecrets(['db-password'])},
    });
    expect(
      ecs.components.filter(c => 'environmentSecretShortNames' in c.parameters),
    ).not.toHaveLength(0);
  });

  it('refuses an offer that drops the selection when it instantiates', () => {
    expect(() =>
      functionFractal().toLiveSystem({
        name: 'ls',
        environment,
        select: {fn: ForgetfulSecretReader({}).withEnvironmentSecrets(['a'])},
      }),
    ).toThrow(
      "Offer 'CustomWorkloads.FaaS.SecretReader' selected for 'fn' emits no " +
        'component carrying its environmentSecretShortNames.',
    );
  });
});

const workloadFractal = (secretEnv: Record<string, unknown>) =>
  createFractal({
    id: 'web',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => ({
      web: bp.add(
        Workload({id: 'web'})
          .withImage('registry/app:1')
          .withEnv({LOG_LEVEL: 'info'})
          .withSecretEnv(secretEnv as never),
      ),
    }),
  });

describe('env and secretEnv on a container environment', () => {
  it('ECS: both become the task definition environment', () => {
    const ls = workloadFractal({
      DB_PASSWORD: secretRef('db-password'),
    }).toLiveSystem({name: 'ls', environment, select: {web: EcsService({})}});
    const task = ls.components.find(c => c.id === 'web-task')!;
    expect(task.parameters.environment).toEqual({
      LOG_LEVEL: 'info',
      DB_PASSWORD: {$envSecret: 'db-password'},
    });
  });

  it('Cloud Run: both become the service environment', () => {
    const ls = workloadFractal({
      DB_PASSWORD: secretRef('db-password'),
    }).toLiveSystem({name: 'ls', environment, select: {web: CloudRun({})}});
    expect(ls.components[0].parameters.environment).toEqual({
      LOG_LEVEL: 'info',
      DB_PASSWORD: {$envSecret: 'db-password'},
    });
    expect(ls.components[0].parameters).not.toHaveProperty('env');
    expect(ls.components[0].parameters).not.toHaveProperty('secretEnv');
  });

  it('refuses a variable set in both env and secretEnv', () => {
    expect(() =>
      workloadFractal({LOG_LEVEL: secretRef('x')}).toLiveSystem({
        name: 'ls',
        environment,
        select: {web: CloudRun({})},
      }),
    ).toThrow("'LOG_LEVEL' is in both env and secretEnv");
  });

  it('reads a reference as exactly the tag', () => {
    expect(isSecretRef(secretRef('a'))).toBe(true);
    expect(isSecretRef({$envSecret: 'a', raw: 'hunter2'})).toBe(false);
    expect(isSecretRef({$envSecret: 1})).toBe(false);
  });

  it('refuses a reference carrying anything beside the tag', () => {
    for (const select of [{web: EcsService({})}, {web: CloudRun({})}]) {
      expect(() =>
        workloadFractal({
          DB_PASSWORD: {$envSecret: 'db-password', raw: 'hunter2'},
        }).toLiveSystem({name: 'ls', environment, select}),
      ).toThrow(
        "secretEnv 'DB_PASSWORD' is not an environment-secret reference",
      );
    }
  });

  it('refuses a raw value in secretEnv', () => {
    expect(() =>
      workloadFractal({DB_PASSWORD: 'hunter2'}).toLiveSystem({
        name: 'ls',
        environment,
        select: {web: EcsService({})},
      }),
    ).toThrow(
      "secretEnv 'DB_PASSWORD' is not an environment-secret reference",
    );
  });
});
