/**
 * network_and_compute_virtual_network_fractal.test.ts
 *
 * M1 migration proof for the NetworkAndCompute "VirtualNetwork" capability under
 * the Fractal + Interface model. Mirrors samples/identity_fractal.test.ts and
 * samples/foundations_pattern.test.ts:
 *
 *   - An infra team authors ONE Fractal whose VirtualNetwork abstract component
 *     carries the candidate Offers (AwsVpc/AWS, AzureVnet/Azure, GcpVpc/GCP,
 *     HetznerNetwork/Hetzner, OciVcn/OCI, ArubaVpc/Aruba).
 *   - A dev specializes through the Interface only (set `cidrBlock`), never naming
 *     a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the neutral params,
 *     declared dependencies and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No VirtualNetwork offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {VirtualNetwork} from '../fractal/component/network_and_compute/iaas/virtual_network';
import {AwsVpc} from '../live_system/component/network_and_compute/iaas/vpc';
import {AzureVnet} from '../live_system/component/network_and_compute/iaas/azure_vnet';
import {GcpVpc} from '../live_system/component/network_and_compute/iaas/gcp_vpc';
import {HetznerNetwork} from '../live_system/component/network_and_compute/iaas/hetzner_network';
import {OciVcn} from '../live_system/component/network_and_compute/iaas/oci_vcn';
import {ArubaVpc} from '../live_system/component/network_and_compute/iaas/aruba_vpc';
import {KebabCaseString} from '../values/kebab_case_string';
import {OwnerType} from '../values/owner_type';
import {OwnerId} from '../values/owner_id';
import {getBoundedContextIdBuilder} from '../bounded_context/id';
import {getEnvironmentBuilder} from '../environment/entity';
import {getEnvironmentIdBuilder} from '../environment/id';
import {getComponentIdBuilder} from '../component/id';
import {getLinkBuilder} from '../component/link';
import {getComponentTypeBuilder} from '../component/type';
import {InfrastructureDomain} from '../values/infrastructure_domain';
import {PascalCaseString} from '../values/pascal_case_string';
import {getParametersInstance} from '../values/generic_parameters';
import {LiveSystemComponent} from '../live_system/component';

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
  .withValue(kebab('some-prerequisite'))
  .build();

const declaredLink = getLinkBuilder()
  .withId(getComponentIdBuilder().withValue(kebab('linked-thing')).build())
  .withType(
    getComponentTypeBuilder()
      .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
      .withName(PascalCaseString.getBuilder().withValue('LinkedThing').build())
      .build(),
  )
  .withParameters(getParametersInstance())
  .build();

// ── Infra team: author the Fractal once. ─────────────────────────────────────
function authorNetworkFractal() {
  return createFractal({
    id: 'network',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed virtual network',
    boundedContextId,
    blueprint: bp => ({
      network: bp.add(
        VirtualNetwork.create({
          id: 'network',
          displayName: 'Spoke Virtual Network',
          offers: [AwsVpc, AzureVnet, GcpVpc, HetznerNetwork, OciVcn, ArubaVpc],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withCidrBlock: (cidr: string) => bp.network.set('cidrBlock', cidr),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorNetworkFractal();
  fractal.operations.withCidrBlock('10.0.0.0/16');
  return fractal.toLiveSystem({name: 'acme-net', environment, provider});
}

describe('VirtualNetwork Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider for each provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['AWS', 'NetworkAndCompute.IaaS.AwsVpc'],
      ['Azure', 'NetworkAndCompute.IaaS.VNet'],
      ['GCP', 'NetworkAndCompute.IaaS.GcpVpc'],
      ['Hetzner', 'NetworkAndCompute.IaaS.HetznerNetwork'],
      ['OCI', 'NetworkAndCompute.IaaS.OciVcn'],
      ['Aruba', 'NetworkAndCompute.IaaS.ArubaVpc'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const net = ls.components.find(c => c.id.toString() === 'network')!;
      expect(net).toBeDefined();
      expect(net.type.toString()).toBe(expectedType);
      expect(net.provider).toBe(provider);
      // No vendor sub-components for any of these offers.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows identical neutral params, declared deps and links to whichever offer the provider selects', () => {
    const awsNet = specialize('AWS').components.find(
      c => c.id.toString() === 'network',
    )!;
    const azureNet = specialize('Azure').components.find(
      c => c.id.toString() === 'network',
    )!;
    const gcpNet = specialize('GCP').components.find(
      c => c.id.toString() === 'network',
    )!;

    // neutral param set via the interface — identical across providers
    expect(awsNet.parameters.getOptionalFieldByName('cidrBlock')).toBe(
      '10.0.0.0/16',
    );
    expect(awsNet.parameters.getOptionalFieldByName('cidrBlock')).toEqual(
      azureNet.parameters.getOptionalFieldByName('cidrBlock'),
    );
    expect(azureNet.parameters.getOptionalFieldByName('cidrBlock')).toEqual(
      gcpNet.parameters.getOptionalFieldByName('cidrBlock'),
    );

    // declared dependency + link inherited by every offer
    for (const net of [awsNet, azureNet, gcpNet]) {
      expect(
        net.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
      ).toBe(true);
      expect(net.links.some(l => l.id.toString() === 'linked-thing')).toBe(
        true,
      );
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('AWS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('network');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('AWS');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorNetworkFractal().blueprint;
    const network = blueprint.components.find(
      c => c.id.toString() === 'network',
    )!;

    expect(network.services).toBeDefined();
    // All six offers share the IaaS delivery model → one Service.
    const serviceTypes = network.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['NetworkAndCompute.IaaS.VirtualNetwork']);

    const offerTypes = network
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'NetworkAndCompute.IaaS.ArubaVpc',
      'NetworkAndCompute.IaaS.AwsVpc',
      'NetworkAndCompute.IaaS.GcpVpc',
      'NetworkAndCompute.IaaS.HetznerNetwork',
      'NetworkAndCompute.IaaS.OciVcn',
      'NetworkAndCompute.IaaS.VNet',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorNetworkFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-net', environment, provider: 'SaaS'}),
    ).toThrow(/No VirtualNetwork offer/);
  });
});
