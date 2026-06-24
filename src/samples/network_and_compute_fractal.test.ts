/**
 * network_and_compute_fractal.test.ts
 *
 * M1 proof for the NetworkAndCompute "ContainerPlatform" capability, migrated to
 * the Fractal + Interface model. Mirrors samples/identity_fractal.test.ts and
 * samples/foundations_pattern.test.ts.
 *
 * Contract proven:
 *   - An infra team authors ONE Fractal whose ContainerPlatform abstract
 *     component carries four candidate offers (Eks/AWS, Aks/Azure, Gke/GCP,
 *     ArubaKaaS/Aruba).
 *   - A dev specializes ONLY through the Interface (vendor-neutral `nodePools`)
 *     plus declared dependencies and links — never naming an offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the neutral params,
 *     dependencies and links flow through byte-for-byte identical.
 *   - `toLiveSystem` returns a real, validated LiveSystem.
 *   - The authored Blueprint serializes every candidate offer onto a Service.
 *   - An unknown provider throws `No ContainerPlatform offer …`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {ContainerPlatform} from '../fractal/component/network_and_compute/paas/container_platform';
import {Eks} from '../live_system/component/network_and_compute/paas/eks_cluster';
import {Aks} from '../live_system/component/network_and_compute/paas/azure_aks';
import {Gke} from '../live_system/component/network_and_compute/paas/gcp_gke';
import {ArubaKaaS} from '../live_system/component/network_and_compute/paas/aruba_kaas';
import {KebabCaseString} from '../values/kebab_case_string';
import {OwnerType} from '../values/owner_type';
import {OwnerId} from '../values/owner_id';
import {getBoundedContextIdBuilder} from '../bounded_context/id';
import {getEnvironmentBuilder} from '../environment/entity';
import {getEnvironmentIdBuilder} from '../environment/id';
import {getComponentIdBuilder} from '../component/id';
import {getLinkBuilder} from '../component/link';
import {getComponentTypeBuilder} from '../component/type';
import {PascalCaseString} from '../values/pascal_case_string';
import {InfrastructureDomain} from '../values/infrastructure_domain';
import {getParametersInstance} from '../values/generic_parameters';

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

// A dependency and a link the abstract component declares — both must be
// inherited by whichever offer the provider selects.
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

// ── Infra team: author the Fractal once. ─────────────────────────────────────
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
          offers: [Eks, Aks, Gke, ArubaKaaS],
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

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: 'AWS' | 'Azure' | 'GCP' | 'Aruba') {
  const fractal = authorPlatformFractal();
  fractal.operations.withNodePools(NODE_POOLS);
  return fractal.toLiveSystem({name: 'acme-platform', environment, provider});
}

describe('ContainerPlatform Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider per provider from the same authored Fractal', () => {
    const cases: Array<{
      provider: 'AWS' | 'Azure' | 'GCP' | 'Aruba';
      type: string;
    }> = [
      {provider: 'AWS', type: 'NetworkAndCompute.PaaS.Eks'},
      {provider: 'Azure', type: 'NetworkAndCompute.PaaS.Aks'},
      {provider: 'GCP', type: 'NetworkAndCompute.PaaS.Gke'},
      {provider: 'Aruba', type: 'NetworkAndCompute.PaaS.ArubaKaaS'},
    ];

    for (const c of cases) {
      const ls = specialize(c.provider);
      const platform = ls.components.find(
        comp => comp.id.toString() === 'platform',
      )!;
      expect(platform).toBeDefined();
      expect(platform.type.toString()).toBe(c.type);
      expect(platform.provider).toBe(c.provider);
    }
  });

  it('flows identical neutral params, dependencies and links to whichever offer the provider selects', () => {
    const aws = specialize('AWS').components.find(
      c => c.id.toString() === 'platform',
    )!;
    const azure = specialize('Azure').components.find(
      c => c.id.toString() === 'platform',
    )!;

    // neutral param set via the interface — identical across offers
    expect(aws.parameters.getOptionalFieldByName('nodePools')).toEqual(
      NODE_POOLS,
    );
    expect(aws.parameters.getOptionalFieldByName('nodePools')).toEqual(
      azure.parameters.getOptionalFieldByName('nodePools'),
    );

    // declared dependency inherited by both offers
    expect(
      aws.dependencies.some(d => d.id.toString() === 'cluster-subnet'),
    ).toBe(true);
    expect(
      azure.dependencies.some(d => d.id.toString() === 'cluster-subnet'),
    ).toBe(true);

    // declared link inherited by both offers
    expect(aws.links.some(l => l.id.toString() === 'linked-registry')).toBe(
      true,
    );
    expect(azure.links.some(l => l.id.toString() === 'linked-registry')).toBe(
      true,
    );
  });

  it('produces a real, validated LiveSystem', () => {
    const ls = specialize('GCP');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('platform');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('GCP');
  });
});

describe('ContainerPlatform Fractal — interface and offer-selection guarantees', () => {
  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorPlatformFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-platform',
        environment,
        provider: 'OCI',
      }),
    ).toThrow(/No ContainerPlatform offer/);
  });

  it('serializes every candidate offer onto the Blueprint Services', () => {
    const platform = authorPlatformFractal().blueprint.components.find(
      c => c.id.toString() === 'platform',
    )!;

    expect(platform.services).toBeDefined();
    // All four offers are PaaS, so they group under one Service.
    const serviceTypes = platform.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['NetworkAndCompute.PaaS.ContainerPlatform']);

    const offerTypes = platform
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'NetworkAndCompute.PaaS.Aks',
      'NetworkAndCompute.PaaS.ArubaKaaS',
      'NetworkAndCompute.PaaS.Eks',
      'NetworkAndCompute.PaaS.Gke',
    ]);
  });
});
