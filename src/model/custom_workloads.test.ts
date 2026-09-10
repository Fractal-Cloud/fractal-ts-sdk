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
import {ContainerPlatform} from './components/network_and_compute';
import {Aks, Eks, Gke} from './offers/network_and_compute';
import {
  KUBERNETES_WORKLOAD_CONTRACT_PARAMS,
  KUBERNETES_WORKLOAD_UNDECLARED_PARAMS,
  withContractImageName,
} from './offers/kubernetes_workload_contract';

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
    // Spelled out on purpose: importing the constant would make this pass after
    // any rename. The literal is what pins the wire contract.
    expect(web.type).toBe('CustomWorkloads.CaaS.KubernetesWorkload');
    expect(web.provider).toBeUndefined();
  });

  /**
   * The regression suite for the `withImage` defect.
   *
   * The bug shipped because every existing assertion here compares the SDK to
   * ITSELF: the `withImage` operation above sets `'image'` and the AWS test
   * asserts `parameters.image`, so the pair agrees no matter which name the
   * agent reads. Nothing pruned by the parameter contract can ever fail such a
   * test. These assert against the transcribed caas-k8s contract instead, so a
   * key the agent does not declare fails the build rather than a sweep.
   */
  describe('KubernetesWorkload emits the names its agent contract declares', () => {
    const k8sWeb = () =>
      authorFractal()
        .specialize()
        .withImage('registry/app:1')
        .withReplicas(6)
        .toLiveSystem({
          name: 'acme-prod',
          environment,
          select: {...fullSelect(), web: K8sWorkload({namespace: 'apps'})},
        })
        .components.find(c => c.id === 'web')!;

    it('carries the image under the contract name, not the neutral one', () => {
      const web = k8sWeb();
      // Spelled out rather than imported: importing the constant would make
      // this pass after a rename on the SDK side, which is the very mistake
      // being guarded against. The literal is what pins the wire contract.
      expect(web.parameters.containerImage).toBe('registry/app:1');
      expect(web.parameters.image).toBeUndefined();
    });

    it('an explicitly set containerImage is not overwritten by the neutral image', () => {
      const web = createFractal({
        id: 'custom-workloads-stack',
        version: {major: 1, minor: 0, patch: 0},
        boundedContextId,
        blueprint: bp => ({web: bp.add(Workload({id: 'web'}))}),
        operations: s => ({
          withNeutralImage: (v: string) => s.web.set('image', v),
          withContractImage: (v: string) => s.web.set('containerImage', v),
        }),
      })
        .specialize()
        .withNeutralImage('neutral:1')
        .withContractImage('explicit:2')
        .toLiveSystem({
          name: 'acme-prod',
          environment,
          select: {web: K8sWorkload({namespace: 'apps'})},
        })
        .components.find(c => c.id === 'web')!;

      expect(web.parameters.containerImage).toBe('explicit:2');
      expect(web.parameters.image).toBeUndefined();
    });

    /**
     * CHARACTERIZATION, not an endorsement. Every `WorkloadNode` setter is
     * exercised, and the names that survive are compared with the contract.
     * The listed keys are silently pruned in flight exactly as `image` was —
     * the difference is only that each has an agent-side default, so they fail
     * as a PASSING sweep that never applied the architect's guardrail rather
     * than as a red one.
     *
     * They are pinned rather than fixed on purpose: `port`/`cpuRequest`/
     * `memoryRequest` have plausible contract counterparts (`containerPort`,
     * `resourceRequests`) whose shapes differ, and `maxReplicas`/`healthCheck`
     * have no counterpart at all, so each is a design decision and not a
     * rename. This list is the record of that debt; shortening it means a
     * setter now reaches the agent, and lengthening it means a new one does
     * not. Either way the change should be deliberate.
     */
    it('pins the setters whose names the contract still does not declare', () => {
      const web = createFractal({
        id: 'custom-workloads-stack',
        version: {major: 1, minor: 0, patch: 0},
        boundedContextId,
        blueprint: bp => ({
          web: bp.add(
            Workload({id: 'web'})
              .withImage('registry/app:1')
              .withPort(8080)
              .withReplicas(3)
              .withEnv({LOG_LEVEL: 'info'})
              .withCpuRequest('500m')
              .withMemoryRequest('256Mi')
              .withMaxReplicas(20)
              .withHealthCheck({path: '/healthz', port: 8080}),
          ),
        }),
        operations: () => ({}),
      })
        .specialize()
        .toLiveSystem({
          name: 'acme-prod',
          environment,
          select: {web: K8sWorkload({namespace: 'apps'})},
        })
        .components.find(c => c.id === 'web')!;

      const declared = new Set<string>([
        ...KUBERNETES_WORKLOAD_CONTRACT_PARAMS,
        ...KUBERNETES_WORKLOAD_UNDECLARED_PARAMS,
      ]);
      const undeclared = Object.keys(web.parameters)
        .filter(k => !declared.has(k))
        .sort();

      expect(undeclared).toEqual([
        'cpuRequest',
        'healthCheck',
        'maxReplicas',
        'memoryRequest',
        'port',
      ]);
      // The one this change fixes is no longer among them.
      expect(undeclared).not.toContain('image');
      expect(web.parameters.containerImage).toBe('registry/app:1');
    });
  });

  /**
   * The CHILD path — the one `app_with_identity` actually takes, and the one a
   * first version of this fix missed entirely.
   *
   * A Workload added under a ContainerPlatform is never offer-selected:
   * `toLiveSystem` calls `instantiate` only for top-level components, so the
   * platform offer emits the child itself and `K8sWorkload.instantiate` never
   * runs. The child is nonetheless emitted under the caas-k8s offer type, so it
   * needs the identical translation. Translating only the selected path was
   * correct code on a path no sample used.
   */
  describe('a Workload added as a ContainerPlatform child', () => {
    const childOf = (
      platformOffer: unknown,
      image = 'acme/web:1.4.0',
      extra: (w: ReturnType<typeof Workload>) => ReturnType<typeof Workload> = w =>
        w,
    ) =>
      createFractal({
        id: 'child-workload-stack',
        version: {major: 1, minor: 0, patch: 0},
        boundedContextId,
        blueprint: bp => ({
          platform: bp.add(ContainerPlatform({id: 'app-platform'})),
        }),
        operations: s => ({
          addWorkload: () =>
            s.platform.addChild(
              extra(Workload({id: 'orders'}).withImage(image)),
            ),
        }),
      })
        .specialize()
        .addWorkload()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .toLiveSystem({
          name: 'acme-prod',
          environment,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          select: {'app-platform': platformOffer as any},
        })
        .components.find(c => c.id === 'orders')!;

    it.each([
      ['Aks', Aks({})],
      ['Eks', Eks({})],
      ['Gke', Gke({})],
    ])(
      'emits the image under the contract name on %s',
      (_name, platformOffer) => {
        const child = childOf(platformOffer);
        // Literals on purpose: importing the constants would let a rename on
        // the SDK side pass straight through this assertion.
        expect(child.type).toBe('CustomWorkloads.CaaS.KubernetesWorkload');
        expect(child.parameters.containerImage).toBe('acme/web:1.4.0');
        expect(child.parameters.image).toBeUndefined();
      },
    );

    it('emits no parameter the contract does not declare', () => {
      const child = childOf(Aks({}));
      const declared = new Set<string>([
        ...KUBERNETES_WORKLOAD_CONTRACT_PARAMS,
        ...KUBERNETES_WORKLOAD_UNDECLARED_PARAMS,
      ]);
      expect(
        Object.keys(child.parameters).filter(k => !declared.has(k)),
      ).toEqual([]);
    });
  });

  /**
   * `withImage` LOCKS the neutral key, but `containerImage` is a different key
   * and is not locked — so without a check, a dev-open `set('containerImage')`
   * silently defeats an architect's guardrail and the lock ends up guarding
   * only the name nothing reads. `ctx.locked` exists for exactly this.
   */
  describe('a locked image versus a dev-open containerImage', () => {
    const build = (opts: {lock: boolean; override?: unknown}) => {
      const f = createFractal({
        id: 'guardrail-stack',
        version: {major: 1, minor: 0, patch: 0},
        boundedContextId,
        blueprint: bp => {
          const base = Workload({id: 'web'});
          return {
            web: bp.add(opts.lock ? base.withImage('architect/locked:1') : base),
          };
        },
        operations: s => ({
          apply: () => s.web.set('containerImage', opts.override),
        }),
      });
      return () =>
        f
          .specialize()
          .apply()
          .toLiveSystem({
            name: 'acme-prod',
            environment,
            select: {web: K8sWorkload({namespace: 'apps'})},
          })
          .components.find(c => c.id === 'web')!;
    };

    it('refuses the override rather than letting it win silently (selected offer)', () => {
      expect(build({lock: true, override: 'dev/override:9'})).toThrow(
        /locked\s+guardrail/,
      );
    });

    /**
     * The child path shares the check but cannot currently reach it: a child
     * node is added whole via `addChild`, and no `WorkloadNode` setter writes
     * `containerImage`, so there is no public way to give a child both a locked
     * `image` and a dev-open override. Asserted on the shared helper directly
     * so the behavior is pinned for the day a child gains dev-open parameters,
     * rather than pinned nowhere.
     */
    it('refuses the override in the helper both emit paths share', () => {
      expect(() =>
        withContractImageName(
          {image: 'architect/locked:1', containerImage: 'dev/override:9'},
          'orders',
          ['image'],
        ),
      ).toThrow(/locked\s+guardrail/);
    });

    it('allows the override when the image is dev-open, not a guardrail', () => {
      expect(
        build({lock: false, override: 'dev/override:9'})().parameters
          .containerImage,
      ).toBe('dev/override:9');
    });

    it('a blank containerImage neither suppresses the guardrail nor ships an empty image', () => {
      // `??` is nullish, so '' used to win and ship an image the agent rejects.
      expect(
        build({lock: true, override: ''})().parameters.containerImage,
      ).toBe('architect/locked:1');
    });

    it('emits no image key at all when there is no image to emit', () => {
      const web = createFractal({
        id: 'guardrail-stack',
        version: {major: 1, minor: 0, patch: 0},
        boundedContextId,
        blueprint: bp => ({web: bp.add(Workload({id: 'web'}))}),
        operations: s => ({blank: () => s.web.set('containerImage', '   ')}),
      })
        .specialize()
        .blank()
        .toLiveSystem({
          name: 'acme-prod',
          environment,
          select: {web: K8sWorkload({namespace: 'apps'})},
        })
        .components.find(c => c.id === 'web')!;
      // Absent, so the agent names the missing required parameter instead of
      // rejecting a blank one.
      expect('containerImage' in web.parameters).toBe(false);
      expect(web.parameters.image).toBeUndefined();
    });
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
