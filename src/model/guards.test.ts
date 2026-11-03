/**
 * guards.test.ts — toLiveSystem validation guards.
 *
 * Covers the review-hardening cases:
 *  - an offer that does not emit an app-added child throws (no silent drop);
 *  - an unknown `select` key (e.g. a typo'd component id) throws.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {ObjectStorage, RelationalDatabase} from './components/storage';
import {AwsS3, AzureBlob} from './offers/storage';
import {TraefikGateway} from './offers/api_management';
import {EcsService, K8sWorkload} from './offers/custom_workloads';
import {GcpSubnet} from './offers/network_and_compute';
import type {InstantiationContext} from './core';

const environment = {name: 'dev'};
const boundedContextId = {name: 'reusable-templates'};

describe('toLiveSystem guards', () => {
  it('throws when the selected offer drops an app-added child component', () => {
    // ObjectStorage's offer (AwsS3) uses the default instantiate and does NOT
    // emit children — adding a child under it must fail loudly.
    const fractal = createFractal({
      id: 'g',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({bucket: bp.add(ObjectStorage({id: 'bucket'}))}),
      operations: s => ({
        addOrphan: () => s.bucket.addChild(RelationalDatabase({id: 'orphan'})),
      }),
    });
    expect(() =>
      fractal
        .specialize()
        .addOrphan()
        .toLiveSystem({
          name: 'x',
          environment,
          select: {bucket: AwsS3({region: 'us-east-1'})},
        }),
    ).toThrow(/does not emit its child/);
  });

  it('throws on an unknown selection key (typo)', () => {
    const fractal = createFractal({
      id: 'g2',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({bucket: bp.add(ObjectStorage({id: 'bucket'}))}),
    });
    expect(() =>
      fractal.toLiveSystem({
        name: 'x',
        environment,
        select: {
          bucket: AwsS3({region: 'us-east-1'}),
          // @ts-expect-error 'buckets' is not a component in this fractal
          buckets: AwsS3({region: 'us-east-1'}),
        },
      }),
    ).toThrow(/does not match any component/);
  });
});

describe('offer config over a locked guardrail of the same name', () => {
  const ctx = (
    parameters: Record<string, unknown>,
    locked: readonly string[],
  ): InstantiationContext => ({
    id: 'web',
    displayName: 'web',
    parameters,
    locked,
    dependencies: [],
    links: [],
    children: [],
  });

  it('is refused on the default instantiate path', () => {
    expect(() =>
      GcpSubnet({region: 'europe-west1'}).instantiate(
        ctx({region: 'us-central1'}, ['region']),
      ),
    ).toThrow(
      /Parameter 'region' on 'web' is a locked guardrail, and the NetworkAndCompute.IaaS.GcpSubnet offer config sets 'region'/,
    );
  });

  it('is refused on a custom instantiate path (K8sWorkload)', () => {
    const k8s = (cfg: Record<string, unknown>) =>
      K8sWorkload({namespace: 'fractal', ...cfg} as never);
    expect(() =>
      k8s({resourceLimits: {cpu: '8'}}).instantiate(
        ctx({image: 'registry/app:1', resourceLimits: {cpu: '1'}}, [
          'resourceLimits',
        ]),
      ),
    ).toThrow(/'resourceLimits' on 'web' is a locked guardrail/);
    expect(() =>
      k8s({cpuLimit: '8'}).instantiate(
        ctx({image: 'registry/app:1', cpuLimit: '1'}, ['cpuLimit']),
      ),
    ).toThrow(/'cpuLimit' on 'web' is a locked guardrail/);
  });

  it('accepts config that repeats the locked value, and config over an open one', () => {
    const [same] = GcpSubnet({region: 'us-central1'}).instantiate(
      ctx({region: 'us-central1'}, ['region']),
    );
    expect(same.parameters.region).toBe('us-central1');
    const [open] = GcpSubnet({region: 'europe-west1'}).instantiate(
      ctx({region: 'us-central1'}, []),
    );
    expect(open.parameters.region).toBe('europe-west1');
  });

  it('keeps a locked or open parameter when the config sets its key to undefined (default path)', () => {
    const [locked] = GcpSubnet({region: undefined}).instantiate(
      ctx({region: 'us-central1'}, ['region']),
    );
    expect(locked.parameters.region).toBe('us-central1');
    const [open] = GcpSubnet({region: undefined}).instantiate(
      ctx({region: 'us-central1'}, []),
    );
    expect(open.parameters.region).toBe('us-central1');
  });

  it('keeps a locked or open parameter when the config sets its key to undefined (K8sWorkload)', () => {
    const [locked] = K8sWorkload({
      namespace: 'fractal',
      resourceLimits: undefined,
    }).instantiate(
      ctx({image: 'registry/app:1', resourceLimits: {cpu: '1'}}, [
        'resourceLimits',
      ]),
    );
    expect(locked.parameters.resourceLimits).toEqual({cpu: '1'});
    const [open] = K8sWorkload({
      namespace: 'fractal',
      nodeSelector: undefined,
    }).instantiate(
      ctx({image: 'registry/app:1', nodeSelector: {pool: 'apps'}}, []),
    );
    expect(open.parameters.nodeSelector).toEqual({pool: 'apps'});
  });

  it('accepts a list that repeats a locked comma-separated value', () => {
    const [gw] = TraefikGateway({
      tlsHosts: ['a.example.com', 'b.example.com'],
    }).instantiate(
      ctx({tlsHosts: 'a.example.com,b.example.com'}, ['tlsHosts']),
    );
    expect(gw.parameters.tlsHosts).toBe('a.example.com,b.example.com');
    expect(() =>
      TraefikGateway({tlsHosts: ['c.example.com']}).instantiate(
        ctx({tlsHosts: 'a.example.com,b.example.com'}, ['tlsHosts']),
      ),
    ).toThrow(/'tlsHosts' on 'web' is a locked guardrail/);
  });

  it('ignores a nested key set to undefined when the config repeats a locked value (default path)', () => {
    const labels = (v: Record<string, unknown>) =>
      GcpSubnet({labels: v} as never).instantiate(
        ctx({labels: {team: 'core'}}, ['labels']),
      );
    const [same] = labels({team: 'core', owner: undefined});
    expect(same.parameters.labels).toStrictEqual({team: 'core'});
    expect(() => labels({team: 'edge', owner: undefined})).toThrow(
      /'labels' on 'web' is a locked guardrail/,
    );
  });

  it('ignores a nested key set to undefined when the config repeats a locked value (K8sWorkload)', () => {
    const limits = (v: Record<string, unknown>) =>
      K8sWorkload({namespace: 'fractal', resourceLimits: v}).instantiate(
        ctx({image: 'registry/app:1', resourceLimits: {cpu: '1'}}, [
          'resourceLimits',
        ]),
      );
    const [same] = limits({cpu: '1', memory: undefined});
    expect(same.parameters.resourceLimits).toStrictEqual({cpu: '1'});
    expect(() => limits({cpu: '2', memory: undefined})).toThrow(
      /'resourceLimits' on 'web' is a locked guardrail/,
    );
  });

  it('keeps array positions: an undefined element is not dropped', () => {
    expect(() =>
      GcpSubnet({tags: ['a', undefined]} as never).instantiate(
        ctx({tags: ['a']}, ['tags']),
      ),
    ).toThrow(/'tags' on 'web' is a locked guardrail/);
  });
});

describe('a vendor config value that sets nothing, against a neutral one', () => {
  // EcsService translates the neutral `env` into the task's `environment`.
  const task = (cfg: Record<string, unknown>, locked: readonly string[]) =>
    EcsService({launchType: 'FARGATE', ...cfg} as never)
      .instantiate({
        id: 'w',
        displayName: 'w',
        parameters: {image: 'registry/app:1', port: 80, env: {X: '1'}},
        locked,
        dependencies: [],
        links: [],
        children: [],
      })
      .find(c => c.id === 'w-task')!.parameters.environment;

  it('does not drop an open neutral value', () => {
    const translated = task({}, []);
    expect(translated).toBeDefined();
    expect(task({environment: {A: undefined}}, [])).toStrictEqual(translated);
  });

  it('takes a literal {} as written: an empty environment, which a locked env refuses', () => {
    expect(task({environment: {}}, [])).toStrictEqual({});
    expect(() => task({environment: {}}, ['env'])).toThrow(
      /'env' on 'w' is a locked guardrail/,
    );
  });

  it('is not refused over a locked neutral value', () => {
    expect(task({environment: {A: undefined}}, ['env'])).toStrictEqual(
      task({}, ['env']),
    );
  });

  it('holds for a vendor value set on the component itself, not only in config', () => {
    const fromParameters = (locked: readonly string[]) =>
      EcsService({launchType: 'FARGATE'})
        .instantiate({
          id: 'w',
          displayName: 'w',
          parameters: {
            image: 'registry/app:1',
            port: 80,
            env: {X: '1'},
            environment: {A: undefined},
          },
          locked,
          dependencies: [],
          links: [],
          children: [],
        })
        .find(c => c.id === 'w-task')!.parameters.environment;
    expect(fromParameters([])).toStrictEqual(task({}, []));
    expect(fromParameters(['env'])).toStrictEqual(task({}, ['env']));
  });

  it('still wins over an open neutral value, and is refused over a locked one, when it sets something', () => {
    expect(task({environment: {A: '2'}}, [])).not.toStrictEqual(task({}, []));
    expect(() => task({environment: {A: '2'}}, ['env'])).toThrow(
      /'env' on 'w' is a locked guardrail/,
    );
  });
});

describe('a literal {} offer config value reaches the wire', () => {
  it('sends AzureBlob networkRuleSet, routingPreference, encryption and identity as {}', () => {
    const [blob] = AzureBlob({
      networkRuleSet: {},
      routingPreference: {},
      encryption: {},
      identity: {},
    } as never).instantiate({
      id: 'b',
      displayName: 'b',
      parameters: {},
      locked: [],
      dependencies: [],
      links: [],
      children: [],
    });
    expect(blob.parameters).toMatchObject({
      networkRuleSet: {},
      routingPreference: {},
      encryption: {},
      identity: {},
    });
    for (const k of [
      'networkRuleSet',
      'routingPreference',
      'encryption',
      'identity',
    ]) {
      expect(blob.parameters[k], k).toStrictEqual({});
    }
  });
});
