/**
 * aruba_vpc_peering.test.ts
 *
 * Migration proof for the NetworkAndCompute "VpcPeering" capability under the
 * Fractal + Interface model. Mirrors samples/network_and_compute_fractal.test.ts
 * and samples/foundations_pattern.test.ts.
 *
 * Contract proven:
 *   - An infra team authors ONE Fractal whose VpcPeering abstract component carries
 *     the ArubaVpcPeering offer (Aruba).
 *   - A dev specializes ONLY through the Interface (vendor-neutral `peerVpcId`)
 *     plus declared dependencies and links — never naming an offer.
 *   - The Provider chosen at LiveSystem time selects the offer.
 *   - `toLiveSystem` returns a real, validated LiveSystem.
 *   - The authored Blueprint serializes the candidate offer onto a Service.
 *   - An unknown provider throws `No VpcPeering offer …`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../../../../fractal/create_fractal';
import {VpcPeering} from '../../../../fractal/component/network_and_compute/iaas/vpc_peering';
import {ArubaVpcPeering} from './aruba_vpc_peering';
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

// A dependency and a link the abstract component declares — both must be
// inherited by whichever offer the provider selects.
const declaredDependencyId = getComponentIdBuilder()
  .withValue(kebab('local-vpc'))
  .build();

const declaredLink = getLinkBuilder()
  .withId(
    getComponentIdBuilder().withValue(kebab('linked-route-table')).build(),
  )
  .withType(
    getComponentTypeBuilder()
      .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
      .withName(
        PascalCaseString.getBuilder().withValue('LinkedRouteTable').build(),
      )
      .build(),
  )
  .withParameters(getParametersInstance())
  .build();

const PEER_VPC_ID = 'vpc-abc123';

// ── Infra team: author the Fractal once. ─────────────────────────────────────
function authorPeeringFractal() {
  return createFractal({
    id: 'peering',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed VPC peering',
    boundedContextId,
    blueprint: bp => ({
      peering: bp.add(
        VpcPeering.create({
          id: 'peering',
          displayName: 'VPC Peering',
          offers: [ArubaVpcPeering],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withPeerVpcId: (peerVpcId: string) =>
        bp.peering.set(VpcPeering.PEER_VPC_ID_PARAM, peerVpcId),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: 'Aruba' | 'AWS') {
  const fractal = authorPeeringFractal();
  fractal.operations.withPeerVpcId(PEER_VPC_ID);
  return fractal.toLiveSystem({name: 'acme-peering', environment, provider});
}

describe('VpcPeering Fractal — provider-driven offer swap', () => {
  it('selects the Aruba offer type/provider from the authored Fractal', () => {
    const ls = specialize('Aruba');
    const peering = ls.components.find(
      comp => comp.id.toString() === 'peering',
    )!;
    expect(peering).toBeDefined();
    expect(peering.type.toString()).toBe(
      'NetworkAndCompute.IaaS.ArubaVpcPeering',
    );
    expect(peering.provider).toBe('Aruba');
  });

  it('flows neutral params, dependencies and links to the selected offer', () => {
    const peering = specialize('Aruba').components.find(
      c => c.id.toString() === 'peering',
    )!;

    // neutral param set via the interface
    expect(peering.parameters.getOptionalFieldByName('peerVpcId')).toBe(
      PEER_VPC_ID,
    );

    // declared dependency inherited by the offer
    expect(
      peering.dependencies.some(d => d.id.toString() === 'local-vpc'),
    ).toBe(true);

    // declared link inherited by the offer
    expect(
      peering.links.some(l => l.id.toString() === 'linked-route-table'),
    ).toBe(true);
  });

  it('produces a real, validated LiveSystem', () => {
    const ls = specialize('Aruba');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('peering');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Aruba');
  });
});

describe('VpcPeering Fractal — interface and offer-selection guarantees', () => {
  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorPeeringFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-peering',
        environment,
        provider: 'AWS',
      }),
    ).toThrow(/No VpcPeering offer/);
  });

  it('serializes the candidate offer onto the Blueprint Services', () => {
    const peering = authorPeeringFractal().blueprint.components.find(
      c => c.id.toString() === 'peering',
    )!;

    expect(peering.services).toBeDefined();
    const serviceTypes = peering.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['NetworkAndCompute.IaaS.VpcPeering']);

    const offerTypes = peering
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['NetworkAndCompute.IaaS.ArubaVpcPeering']);
  });
});
