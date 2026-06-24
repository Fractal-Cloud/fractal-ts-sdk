/**
 * workload_fractal.test.ts
 *
 * Provider-swap + real-LiveSystem proof for the migrated `Workload` group
 * (M1, NetworkAndCompute). Mirrors samples/foundations_pattern.test.ts:
 *   - one abstract `Workload` capability, candidate functional Offers per
 *     provider (EcsService/AWS, CloudRun/GCP, AzureContainerApp/Azure,
 *     OciContainerInstance/OCI, OpenshiftService/RedHat),
 *   - the dev specializes through the Fractal Interface with vendor-neutral
 *     keys only (image/port/replicas/env),
 *   - the Provider selects the offer; neutral params/deps/links are inherited,
 *   - the AWS offer emits its ECS Task Definition SUB-component,
 *   - toLiveSystem returns a real, validated LiveSystem,
 *   - the Blueprint serializes the candidate offers onto Services,
 *   - an unknown provider throws.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {
  Workload,
  IMAGE_PARAM,
  PORT_PARAM,
  REPLICAS_PARAM,
} from '../fractal/component/custom_workloads/caas/workload';
import {EcsService} from '../live_system/component/network_and_compute/paas/ecs_service';
import {CloudRun} from '../live_system/component/network_and_compute/paas/gcp_cloud_run_service';
import {AzureContainerApp} from '../live_system/component/network_and_compute/paas/azure_container_app';
import {OciContainerInstance} from '../live_system/component/network_and_compute/paas/oci_container_instance';
import {OpenshiftService} from '../live_system/component/network_and_compute/caas/openshift_service';
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
    id: 'workload-fractal',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed container workload',
    boundedContextId,
    blueprint: bp => ({
      api: bp.add(
        Workload.abstract({
          id: 'api',
          displayName: 'API',
          offers: [
            EcsService,
            CloudRun,
            AzureContainerApp,
            OciContainerInstance,
            OpenshiftService,
          ],
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

type WorkloadProvider = 'AWS' | 'GCP' | 'Azure' | 'OCI' | 'RedHat';

function specialize(provider: WorkloadProvider) {
  const fractal = authorWorkloadFractal();
  fractal.operations.withImage('nginx:1.27').withPort(8080).withReplicas(3);
  return fractal.toLiveSystem({name: 'acme-api', environment, provider});
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('Workload group — Fractal + Interface provider swap', () => {
  it('selects the offer by provider', () => {
    const cases: {provider: WorkloadProvider; type: string}[] = [
      {provider: 'AWS', type: 'NetworkAndCompute.CaaS.ECSService'},
      {provider: 'GCP', type: 'NetworkAndCompute.CaaS.CloudRunService'},
      {provider: 'Azure', type: 'NetworkAndCompute.PaaS.AzureContainerApp'},
      {
        provider: 'OCI',
        type: 'NetworkAndCompute.PaaS.OciContainerInstance',
      },
      {provider: 'RedHat', type: 'NetworkAndCompute.CaaS.OpenshiftService'},
    ];

    for (const {provider, type} of cases) {
      const ls = specialize(provider);
      const primary = ls.components.find(c => c.id.toString() === 'api')!;
      expect(primary.type.toString()).toBe(type);
      expect(primary.provider).toBe(provider);
    }
  });

  it('AWS offer emits its ECS Task Definition sub-component; others do not', () => {
    const aws = specialize('AWS');
    const sub = aws.components.find(c => c.id.toString() === 'api-task');
    expect(sub).toBeDefined();
    expect(sub!.type.toString()).toBe(
      'NetworkAndCompute.CaaS.ECSTaskDefinition',
    );

    const gcp = specialize('GCP');
    expect(
      gcp.components.find(c => c.id.toString() === 'api-task'),
    ).toBeUndefined();
  });

  it('inherits neutral params and declared dependency into each offer', () => {
    const aws = specialize('AWS').components.find(
      c => c.id.toString() === 'api',
    )!;
    const gcp = specialize('GCP').components.find(
      c => c.id.toString() === 'api',
    )!;

    // neutral params set through the Interface flow into the chosen offer
    expect(aws.parameters.getOptionalFieldByName(IMAGE_PARAM)).toBe(
      'nginx:1.27',
    );
    expect(aws.parameters.getOptionalFieldByName(PORT_PARAM)).toBe(8080);
    expect(aws.parameters.getOptionalFieldByName(REPLICAS_PARAM)).toBe(3);
    expect(gcp.parameters.getOptionalFieldByName(IMAGE_PARAM)).toBe(
      'nginx:1.27',
    );
    expect(gcp.parameters.getOptionalFieldByName(REPLICAS_PARAM)).toBe(3);

    // declared dependency inherited by both
    expect(aws.dependencies.some(d => d.id.toString() === 'some-subnet')).toBe(
      true,
    );
    expect(gcp.dependencies.some(d => d.id.toString() === 'some-subnet')).toBe(
      true,
    );

    // AWS additionally wires the sub-component dependency
    expect(aws.dependencies.some(d => d.id.toString() === 'api-task')).toBe(
      true,
    );
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('Azure');
    expect(typeof ls.deploy).toBe('function');
    expect(ls.fractalId.toString()).toContain('workload-fractal');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Azure');
  });

  it('serializes candidate offers onto the Blueprint component Services', () => {
    const blueprint = authorWorkloadFractal().blueprint;
    const api = blueprint.components.find(c => c.id.toString() === 'api')!;

    expect(api.services).toBeDefined();
    const serviceTypes = api.services!.map(s => s.type.toString()).sort();
    // CaaS (ECS, Cloud Run, OpenShift) and PaaS (Azure App, OCI) Services.
    expect(serviceTypes).toEqual([
      'CustomWorkloads.CaaS.Workload',
      'CustomWorkloads.PaaS.Workload',
    ]);

    const allOfferTypes = api
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(allOfferTypes).toEqual([
      'NetworkAndCompute.CaaS.CloudRunService',
      'NetworkAndCompute.CaaS.ECSService',
      'NetworkAndCompute.CaaS.OpenshiftService',
      'NetworkAndCompute.PaaS.AzureContainerApp',
      'NetworkAndCompute.PaaS.OciContainerInstance',
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
