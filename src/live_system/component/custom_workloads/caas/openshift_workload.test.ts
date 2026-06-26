/**
 * openshift_workload.test.ts
 *
 * New-model proof for the migrated `OpenshiftWorkload` functional Offer
 * (M1, CustomWorkloads.CaaS). Mirrors samples/workload_fractal.test.ts:
 *   - one abstract `Workload` capability offering [OpenshiftWorkload, CloudRun],
 *   - the dev specializes through the Fractal Interface with vendor-neutral
 *     keys only (image/port/replicas),
 *   - the Provider selects the offer; neutral params/deps are inherited,
 *   - toLiveSystem returns a real, validated LiveSystem,
 *   - an unknown provider throws.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../../../../fractal/create_fractal';
import {
  Workload,
  IMAGE_PARAM,
  PORT_PARAM,
  REPLICAS_PARAM,
} from '../../../../fractal/component/custom_workloads/caas/workload';
import {OpenshiftWorkload} from './openshift_workload';
import {CloudRun} from '../../network_and_compute/paas/gcp_cloud_run_service';
import {getComponentIdBuilder} from '../../../../component/id';
import {KebabCaseString} from '../../../../values/kebab_case_string';
import {getEnvironmentBuilder} from '../../../../environment/entity';
import {getEnvironmentIdBuilder} from '../../../../environment/id';
import {OwnerType} from '../../../../values/owner_type';
import {OwnerId} from '../../../../values/owner_id';
import {getBoundedContextIdBuilder} from '../../../../bounded_context/id';

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
    id: 'openshift-workload-fractal',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed container workload',
    boundedContextId,
    blueprint: bp => ({
      api: bp.add(
        Workload.create({
          id: 'api',
          displayName: 'API',
          offers: [OpenshiftWorkload, CloudRun],
          dependencies: [{id: declaredDependencyId}],
        }),
      ),
    }),
    operations: bp => ({
      withImage: (image: string) => bp.api.set(IMAGE_PARAM, image),
      withPort: (port: number) => bp.api.set(PORT_PARAM, port),
      withReplicas: (replicas: number) => bp.api.set(REPLICAS_PARAM, replicas),
    }),
  });
}

type WorkloadProvider = 'RedHat' | 'GCP';

function specialize(provider: WorkloadProvider) {
  const fractal = authorWorkloadFractal();
  fractal.operations.withImage('nginx:1.27').withPort(8080).withReplicas(3);
  return fractal.toLiveSystem({name: 'acme-api', environment, provider});
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('OpenshiftWorkload — Fractal + Interface offer', () => {
  it('selects the offer by provider', () => {
    const cases: {provider: WorkloadProvider; type: string}[] = [
      {provider: 'RedHat', type: 'CustomWorkloads.CaaS.OpenshiftWorkload'},
      {provider: 'GCP', type: 'NetworkAndCompute.CaaS.CloudRunService'},
    ];

    for (const {provider, type} of cases) {
      const ls = specialize(provider);
      const primary = ls.components.find(c => c.id.toString() === 'api')!;
      expect(primary.type.toString()).toBe(type);
      expect(primary.provider).toBe(provider);
    }
  });

  it('inherits neutral params and declared dependency into the offer', () => {
    const redhat = specialize('RedHat').components.find(
      c => c.id.toString() === 'api',
    )!;

    // neutral params set through the Interface flow into the chosen offer
    expect(redhat.parameters.getOptionalFieldByName(IMAGE_PARAM)).toBe(
      'nginx:1.27',
    );
    expect(redhat.parameters.getOptionalFieldByName(PORT_PARAM)).toBe(8080);
    expect(redhat.parameters.getOptionalFieldByName(REPLICAS_PARAM)).toBe(3);

    // declared dependency inherited
    expect(
      redhat.dependencies.some(d => d.id.toString() === 'some-subnet'),
    ).toBe(true);
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('RedHat');
    expect(typeof ls.deploy).toBe('function');
    expect(ls.fractalId.toString()).toContain('openshift-workload-fractal');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('RedHat');
  });

  it('serializes the OpenShift offer onto the Blueprint component Services', () => {
    const blueprint = authorWorkloadFractal().blueprint;
    const api = blueprint.components.find(c => c.id.toString() === 'api')!;

    expect(api.services).toBeDefined();
    const allOfferTypes = api
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(allOfferTypes).toEqual([
      'CustomWorkloads.CaaS.OpenshiftWorkload',
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
