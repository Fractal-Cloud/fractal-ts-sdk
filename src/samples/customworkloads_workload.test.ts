/**
 * customworkloads_workload.test.ts
 *
 * M8 migration proof for the CustomWorkloads `Workload` capability under the
 * Fractal + Interface model, exercising the generic CaaS Kubernetes Workload
 * Offer (`CaaSK8sWorkload`). Mirrors
 * live_system/component/custom_workloads/caas/openshift_workload.test.ts and
 * samples/workload_fractal.test.ts:
 *   - one abstract `Workload` capability offering [CaaSK8sWorkload, CloudRun],
 *   - the dev specializes through the Fractal Interface with vendor-neutral
 *     keys only (image/port/replicas/env),
 *   - the Provider selects the offer; neutral params/deps are inherited,
 *   - swapping the provider changes only the offer type/provider,
 *   - toLiveSystem returns a real, validated LiveSystem,
 *   - the Blueprint serializes the candidate offers onto its Service(s),
 *   - an unknown provider throws `No Workload offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {
  Workload,
  IMAGE_PARAM,
  PORT_PARAM,
  REPLICAS_PARAM,
  ENV_NEUTRAL_PARAM,
} from '../fractal/component/custom_workloads/caas/workload';
import {CaaSK8sWorkload} from '../live_system/component/custom_workloads/caas/caas_k8s_workload';
import {CloudRun} from '../live_system/component/network_and_compute/paas/gcp_cloud_run_service';
import {getComponentIdBuilder} from '../component/id';
import {KebabCaseString} from '../values/kebab_case_string';
import {getEnvironmentBuilder} from '../environment/entity';
import {getEnvironmentIdBuilder} from '../environment/id';
import {OwnerType} from '../values/owner_type';
import {OwnerId} from '../values/owner_id';
import {getBoundedContextIdBuilder} from '../bounded_context/id';

// ── fixtures ─────────────────────────────────────────────────────────────────

function kebab(value: string): KebabCaseString {
  return KebabCaseString.getBuilder().withValue(value).build();
}

const ownerId = OwnerId.getBuilder()
  .withValue('00000000-0000-0000-0000-000000000001')
  .build();

const boundedContextId = getBoundedContextIdBuilder()
  .withOwnerType(OwnerType.Personal)
  .withOwnerId(ownerId)
  .withName(kebab('reusable-templates'))
  .build();

const environment = getEnvironmentBuilder()
  .withId(
    getEnvironmentIdBuilder()
      .withOwnerType(OwnerType.Personal)
      .withOwnerId(ownerId)
      .withName(kebab('test'))
      .build(),
  )
  .build();

// A blueprint dependency the abstract declares — inherited by every offer.
const declaredDependencyId = getComponentIdBuilder()
  .withValue(kebab('some-subnet'))
  .build();

// ── authored fractal ─────────────────────────────────────────────────────────

function authorWorkloadFractal() {
  return createFractal({
    id: 'customworkloads-workload-fractal',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed container workload',
    boundedContextId,
    blueprint: bp => ({
      api: bp.add(
        Workload.create({
          id: 'api',
          displayName: 'API',
          offers: [CaaSK8sWorkload, CloudRun],
          dependencies: [{id: declaredDependencyId}],
        }),
      ),
    }),
    operations: bp => ({
      withImage: (image: string) => bp.api.set(IMAGE_PARAM, image),
      withPort: (port: number) => bp.api.set(PORT_PARAM, port),
      withReplicas: (replicas: number) => bp.api.set(REPLICAS_PARAM, replicas),
      withEnv: (env: Record<string, string>) =>
        bp.api.set(ENV_NEUTRAL_PARAM, env),
    }),
  });
}

type WorkloadProvider = 'CaaS' | 'GCP';

function specialize(provider: WorkloadProvider) {
  const fractal = authorWorkloadFractal();
  fractal.operations
    .withImage('nginx:1.27')
    .withPort(8080)
    .withReplicas(3)
    .withEnv({LOG_LEVEL: 'info'});
  return fractal.toLiveSystem({name: 'acme-api', environment, provider});
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('CustomWorkloads Workload — Fractal + Interface provider swap', () => {
  it('selects the offer by provider', () => {
    const cases: {provider: WorkloadProvider; type: string}[] = [
      {provider: 'CaaS', type: 'CustomWorkloads.CaaS.K8sDeployment'},
      {provider: 'GCP', type: 'NetworkAndCompute.CaaS.CloudRunService'},
    ];

    for (const {provider, type} of cases) {
      const ls = specialize(provider);
      const primary = ls.components.find(c => c.id.toString() === 'api')!;
      expect(primary.type.toString()).toBe(type);
      expect(primary.provider).toBe(provider);
      // Neither offer emits a vendor sub-component.
      expect(ls.components.length).toBe(1);
    }
  });

  it('inherits identical neutral params and declared dependency into each offer', () => {
    const caas = specialize('CaaS').components.find(
      c => c.id.toString() === 'api',
    )!;
    const gcp = specialize('GCP').components.find(
      c => c.id.toString() === 'api',
    )!;

    // neutral params set through the Interface flow into the chosen offer
    expect(caas.parameters.getOptionalFieldByName(IMAGE_PARAM)).toBe(
      'nginx:1.27',
    );
    expect(caas.parameters.getOptionalFieldByName(PORT_PARAM)).toBe(8080);
    expect(caas.parameters.getOptionalFieldByName(REPLICAS_PARAM)).toBe(3);
    expect(caas.parameters.getOptionalFieldByName(ENV_NEUTRAL_PARAM)).toEqual({
      LOG_LEVEL: 'info',
    });

    // identical across providers
    expect(gcp.parameters.getOptionalFieldByName(IMAGE_PARAM)).toEqual(
      caas.parameters.getOptionalFieldByName(IMAGE_PARAM),
    );
    expect(gcp.parameters.getOptionalFieldByName(REPLICAS_PARAM)).toEqual(
      caas.parameters.getOptionalFieldByName(REPLICAS_PARAM),
    );

    // declared dependency inherited by both
    expect(caas.dependencies.some(d => d.id.toString() === 'some-subnet')).toBe(
      true,
    );
    expect(gcp.dependencies.some(d => d.id.toString() === 'some-subnet')).toBe(
      true,
    );
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('CaaS');
    expect(typeof ls.deploy).toBe('function');
    expect(ls.fractalId.toString()).toContain(
      'customworkloads-workload-fractal',
    );
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('CaaS');
  });

  it('serializes candidate offers onto the Blueprint component Services', () => {
    const blueprint = authorWorkloadFractal().blueprint;
    const api = blueprint.components.find(c => c.id.toString() === 'api')!;

    expect(api.services).toBeDefined();
    const allOfferTypes = api
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(allOfferTypes).toEqual([
      'CustomWorkloads.CaaS.K8sDeployment',
      'NetworkAndCompute.CaaS.CloudRunService',
    ]);
  });

  it('throws for a provider with no candidate offer', () => {
    const fractal = authorWorkloadFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-api',
        environment,
        provider: 'Hetzner' as never,
      }),
    ).toThrow(/No Workload offer/);
  });
});
