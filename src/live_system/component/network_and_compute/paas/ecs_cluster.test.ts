/**
 * ecs_cluster.test.ts
 *
 * Offer-level proof for the migrated AWS ECS container-platform offer
 * (`EcsCluster`). The legacy `AwsEcsCluster.create/satisfy/getBuilder` API was
 * removed in the Fractal + Interface migration; this spec replaces the old
 * sibling test and proves the new functional `Offer` against a real authored
 * Fractal, mirroring samples/network_and_compute_fractal.test.ts.
 *
 * Contract proven:
 *   - The same authored ContainerPlatform Fractal selects EcsCluster (AWS) or
 *     Aks (Azure) purely from the chosen Provider.
 *   - Neutral `nodePools`, declared dependencies and links flow into EcsCluster
 *     identically to any other offer.
 *   - `toLiveSystem` returns a real, validated LiveSystem.
 *   - EcsCluster emits no vendor sub-components.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../../../../fractal/create_fractal';
import {ContainerPlatform} from '../../../../fractal/component/network_and_compute/paas/container_platform';
import {EcsCluster} from './ecs_cluster';
import {Aks} from './azure_aks';
import {KebabCaseString} from '../../../../values/kebab_case_string';
import {OwnerType} from '../../../../values/owner_type';
import {OwnerId} from '../../../../values/owner_id';
import {getBoundedContextIdBuilder} from '../../../../bounded_context/id';
import {getEnvironmentBuilder} from '../../../../environment/entity';
import {getEnvironmentIdBuilder} from '../../../../environment/id';
import {getComponentIdBuilder} from '../../../../component/id';
import {getLinkBuilder} from '../../../../component/link';
import {getComponentTypeBuilder} from '../../../../component/type';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {getParametersInstance} from '../../../../values/generic_parameters';

// ── fixtures ─────────────────────────────────────────────────────────────────

const kebab = (v: string) => KebabCaseString.getBuilder().withValue(v).build();
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

const declaredDependencyId = getComponentIdBuilder()
  .withValue(kebab('cluster-subnet'))
  .build();

const declaredLink = getLinkBuilder()
  .withId(getComponentIdBuilder().withValue(kebab('linked-registry')).build())
  .withType(
    getComponentTypeBuilder()
      .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
      .withName(
        PascalCaseString.getBuilder().withValue('LinkedRegistry').build(),
      )
      .build(),
  )
  .withParameters(getParametersInstance())
  .build();

const NODE_POOLS = [
  {
    name: 'system',
    minNodeCount: 1,
    maxNodeCount: 3,
    autoscalingEnabled: true,
  },
];

function authorPlatformFractal() {
  return createFractal({
    id: 'platform',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed container platform',
    boundedContextId,
    blueprint: bp => ({
      platform: bp.add(
        ContainerPlatform.create({
          id: 'platform',
          displayName: 'Container Platform',
          offers: [EcsCluster, Aks],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withNodePools: (nodePools: Record<string, unknown>[]) =>
        bp.platform.set(ContainerPlatform.NODE_POOLS_PARAM, nodePools),
    }),
  });
}

function specialize(provider: 'AWS' | 'Azure') {
  const fractal = authorPlatformFractal();
  fractal.operations.withNodePools(NODE_POOLS);
  return fractal.toLiveSystem({name: 'acme-platform', environment, provider});
}

describe('EcsCluster offer — ContainerPlatform AWS offer', () => {
  it('is selected by the AWS provider with the correct catalog type', () => {
    const ls = specialize('AWS');
    const platform = ls.components.find(c => c.id.toString() === 'platform')!;
    expect(platform).toBeDefined();
    expect(platform.type.toString()).toBe('NetworkAndCompute.PaaS.ECS');
    expect(platform.provider).toBe('AWS');
  });

  it('emits no vendor sub-components', () => {
    const ls = specialize('AWS');
    expect(ls.components.length).toBe(1);
    expect(
      ls.components.filter(c => c.id.toString() !== 'platform').length,
    ).toBe(0);
  });

  it('inherits neutral params, declared dependencies and links identically across an offer swap', () => {
    const aws = specialize('AWS').components.find(
      c => c.id.toString() === 'platform',
    )!;
    const azure = specialize('Azure').components.find(
      c => c.id.toString() === 'platform',
    )!;

    expect(aws.type.toString()).toBe('NetworkAndCompute.PaaS.ECS');
    expect(azure.type.toString()).toBe('NetworkAndCompute.PaaS.Aks');

    expect(aws.parameters.getOptionalFieldByName('nodePools')).toEqual(
      NODE_POOLS,
    );
    expect(aws.parameters.getOptionalFieldByName('nodePools')).toEqual(
      azure.parameters.getOptionalFieldByName('nodePools'),
    );

    expect(
      aws.dependencies.some(d => d.id.toString() === 'cluster-subnet'),
    ).toBe(true);
    expect(aws.links.some(l => l.id.toString() === 'linked-registry')).toBe(
      true,
    );
  });

  it('produces a real, validated LiveSystem', () => {
    const ls = specialize('AWS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('platform');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('AWS');
  });
});
