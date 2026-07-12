/**
 * custom_workloads.test.ts — executable spec for the CustomWorkloads domain on
 * the LOCKED engine.
 *
 * Proves the CustomWorkloads Component factories + Offer catalogue compose with
 * core:
 *   - guardrails (incl. nested withHealthCheck) are recorded + locked;
 *   - dev-open operations flow through to the live system;
 *   - per-component offer selection builds a LiveSystem with vendor config merged;
 *   - swapping a Workload to a vendor-neutral CaaS offer leaves provider undefined
 *     (future-proof: new offers slot in without touching the blueprint);
 *   - selecting an offer that does not satisfy a Component is a type error AND throws.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {Workload, Function} from './components/custom_workloads';
import {EcsService, K8sWorkload, AwsLambda} from './offers/custom_workloads';

const environment = {};
const boundedContextId = {id: 'custom-workloads-templates'};

function authorFractal() {
  return createFractal({
    id: 'custom-workloads-stack',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const web = bp.add(
        Workload({id: 'web'})
          .withMaxReplicas(20)
          .withCpuRequest('500m')
          .withHealthCheck({path: '/healthz', port: 8080}),
      );
      const fn = bp.add(Function({id: 'ingest-fn'}).withRuntime('nodejs20.x'));
      return {web, fn};
    },
    operations: s => ({
      // dev-open params: image/replicas are NOT guardrails on web, so devs may set them.
      withImage: (v: string) => s.web.set('image', v),
      withReplicas: (n: number) => s.web.set('replicas', n),
    }),
  });
}

const fullSelect = () => ({
  web: EcsService({launchType: 'FARGATE'}),
  'ingest-fn': AwsLambda({roleArn: 'arn:x', handler: 'index.handler'}),
});

describe('CustomWorkloads domain on the locked Fractal model', () => {
  it('blueprint lists the abstract CustomWorkloads Components in order', () => {
    expect(authorFractal().blueprint.components.map(c => c.component)).toEqual([
      'CustomWorkloads.Workload',
      'CustomWorkloads.Function',
    ]);
  });

  it('guardrails are recorded and locked', () => {
    const web = authorFractal().blueprint.components.find(c => c.id === 'web')!;
    expect(web.parameters.maxReplicas).toBe(20);
    expect(web.parameters.cpuRequest).toBe('500m');
    expect(web.parameters.healthCheck).toEqual({path: '/healthz', port: 8080});
    expect(web.locked).toContain('maxReplicas');
    expect(web.locked).toContain('healthCheck');
  });

  it('builds a LiveSystem by per-component offer selection (AWS)', () => {
    const ls = authorFractal()
      .specialize()
      .withImage('registry/app:1')
      .withReplicas(6)
      .toLiveSystem({name: 'acme-prod', environment, select: fullSelect()});

    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));

    // Workload resolved to AWS ECS.
    expect(byId['web'].type).toBe('CustomWorkloads.PaaS.AwsEcsService');
    expect(byId['web'].provider).toBe('AWS');
    // dev-open params flowed into the live component.
    expect(byId['web'].parameters.image).toBe('registry/app:1');
    expect(byId['web'].parameters.replicas).toBe(6);
    // vendor config merged.
    expect(byId['web'].parameters.launchType).toBe('FARGATE');
  });

  it('future-proof: a vendor-neutral CaaS offer leaves provider undefined', () => {
    const ls = authorFractal()
      .specialize()
      .withImage('registry/app:1')
      .withReplicas(6)
      .toLiveSystem({
        name: 'acme-prod',
        environment,
        select: {
          ...fullSelect(),
          web: K8sWorkload({namespace: 'apps'}),
        },
      });

    const web = ls.components.find(c => c.id === 'web')!;
    expect(web.type).toBe('CustomWorkloads.CaaS.K8sWorkload');
    expect(web.provider).toBeUndefined();
  });

  it('selecting an offer that does not satisfy the Component is a type error AND throws', () => {
    expect(() =>
      authorFractal().toLiveSystem({
        name: 'x',
        environment,
        select: {
          ...fullSelect(),
          // @ts-expect-error AwsLambda (CustomWorkloads.Function) cannot satisfy CustomWorkloads.Workload
          web: AwsLambda({roleArn: 'arn:x', handler: 'index.handler'}),
        },
      }),
    ).toThrow(/does not satisfy/);
  });
});
