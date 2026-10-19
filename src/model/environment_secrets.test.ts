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
import {CloudRun, EcsService} from './offers/custom_workloads';
import {secretRef} from './secret';

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

  it('refuses a blank or repeated short name', () => {
    expect(() => SecretReader({}).withEnvironmentSecrets([' '])).toThrow(
      'withEnvironmentSecrets takes environment-secret short names; got " "',
    );
    expect(() => SecretReader({}).withEnvironmentSecrets(['a', 'a'])).toThrow(
      "withEnvironmentSecrets names 'a' twice",
    );
  });

  it('is absent from an offer whose contract cannot access secrets', () => {
    expect('withEnvironmentSecrets' in PlainFunction({})).toBe(false);
    expect('withEnvironmentSecrets' in SecretReader({})).toBe(true);
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
