/**
 * network_and_compute_subnet.test.ts
 *
 * M1 headline test for the NetworkAndCompute "Subnet" capability migrated onto
 * the Fractal + Interface model (mirrors samples/identity_fractal.test.ts).
 *
 * The contract being proven:
 *   - An infra team authors a Fractal whose abstract `Subnet` carries the set of
 *     candidate Offers (AwsSubnet on AWS, AzureSubnet on Azure, ... ).
 *   - A dev team specializes ONLY through the Interface — setting the
 *     vendor-neutral `cidrBlock` — and never names a vendor Offer.
 *   - The concrete Offer is selected by PROVIDER at LiveSystem time. Swapping the
 *     provider (AWS -> Azure) changes which Offer is instantiated, but leaves the
 *     neutral parameters, declared dependencies and links byte-for-byte identical.
 *   - `toLiveSystem` returns a real, validated LiveSystem.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {Subnet} from '../fractal/component/network_and_compute/iaas/subnet';
import {AwsSubnet} from '../live_system/component/network_and_compute/iaas/subnet';
import {AzureSubnet} from '../live_system/component/network_and_compute/iaas/azure_subnet';
import {GcpSubnet} from '../live_system/component/network_and_compute/iaas/gcp_subnet';
import {HetznerSubnet} from '../live_system/component/network_and_compute/iaas/hetzner_subnet';
import {OciSubnet} from '../live_system/component/network_and_compute/iaas/oci_subnet';
import {ArubaSubnet} from '../live_system/component/network_and_compute/iaas/aruba_subnet';
import {VsphereVlan} from '../live_system/component/network_and_compute/iaas/vsphere_vlan';
import {VspherePortGroup} from '../live_system/component/network_and_compute/iaas/vsphere_port_group';
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
import {getParametersInstance} from '../values/generic_parameters';
import {InfrastructureDomain} from '../values/infrastructure_domain';

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

// A dependency and a link the abstract Subnet declares — both must be inherited
// by whichever offer the provider selects.
const declaredDependencyId = getComponentIdBuilder()
  .withValue(kebab('the-vpc'))
  .build();

const declaredLink = getLinkBuilder()
  .withId(getComponentIdBuilder().withValue(kebab('a-firewall')).build())
  .withType(
    getComponentTypeBuilder()
      .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
      .withName(
        PascalCaseString.getBuilder().withValue('SecurityGroup').build(),
      )
      .build(),
  )
  .withParameters(getParametersInstance())
  .build();

// ── Infra team: author the Subnet Fractal once. ──────────────────────────────
// The abstract Subnet declares every candidate offer across all 7 vendors. The
// Interface exposes the vendor-neutral `cidrBlock` op only.
function authorSubnetFractal() {
  return createFractal({
    id: 'network',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed subnet',
    boundedContextId,
    blueprint: bp => ({
      subnet: bp.add(
        Subnet.create({
          id: 'subnet',
          displayName: 'Workload Subnet',
          offers: [
            AwsSubnet,
            AzureSubnet,
            GcpSubnet,
            HetznerSubnet,
            OciSubnet,
            ArubaSubnet,
            VsphereVlan,
            VspherePortGroup,
          ],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withCidrBlock: (cidr: string) => bp.subnet.set('cidrBlock', cidr),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: 'AWS' | 'Azure' | 'GCP') {
  const fractal = authorSubnetFractal();
  fractal.operations.withCidrBlock('10.0.1.0/24');
  // The provider — NOT the dev's specialization code — selects the offer.
  return fractal.toLiveSystem({name: 'acme-net', environment, provider});
}

describe('SubnetFractal — provider-driven offer swap', () => {
  it('selects AwsSubnet on AWS and AzureSubnet on Azure from the same Fractal', () => {
    const aws = specialize('AWS');
    const azure = specialize('Azure');

    const awsSubnet = aws.components.find(c => c.id.toString() === 'subnet')!;
    const azureSubnet = azure.components.find(
      c => c.id.toString() === 'subnet',
    )!;

    expect(awsSubnet).toBeDefined();
    expect(azureSubnet).toBeDefined();

    // The offer identity is the ONLY thing that differs.
    expect(awsSubnet.type.toString()).toBe('NetworkAndCompute.IaaS.AwsSubnet');
    expect(awsSubnet.provider).toBe('AWS');
    expect(azureSubnet.type.toString()).toBe(
      'NetworkAndCompute.IaaS.AzureSubnet',
    );
    expect(azureSubnet.provider).toBe('Azure');
  });

  it('flows identical neutral params, deps and links to whichever offer wins', () => {
    const awsSubnet = specialize('AWS').components.find(
      c => c.id.toString() === 'subnet',
    )!;
    const azureSubnet = specialize('Azure').components.find(
      c => c.id.toString() === 'subnet',
    )!;
    const gcpSubnet = specialize('GCP').components.find(
      c => c.id.toString() === 'subnet',
    )!;

    // neutral param set via the interface — identical across providers
    expect(awsSubnet.parameters.getOptionalFieldByName('cidrBlock')).toBe(
      '10.0.1.0/24',
    );
    expect(awsSubnet.parameters.getOptionalFieldByName('cidrBlock')).toEqual(
      azureSubnet.parameters.getOptionalFieldByName('cidrBlock'),
    );
    expect(awsSubnet.parameters.getOptionalFieldByName('cidrBlock')).toEqual(
      gcpSubnet.parameters.getOptionalFieldByName('cidrBlock'),
    );

    // declared dependency inherited by every offer
    for (const offer of [awsSubnet, azureSubnet, gcpSubnet]) {
      expect(offer.dependencies.some(d => d.id.toString() === 'the-vpc')).toBe(
        true,
      );
      expect(offer.links.some(l => l.id.toString() === 'a-firewall')).toBe(
        true,
      );
    }
  });

  it('produces a real, validated LiveSystem', () => {
    const ls = specialize('AWS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('network');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('AWS');
  });
});

describe('SubnetFractal — interface and offer-selection guarantees', () => {
  it('returns the interface from every operation for fluent chaining', () => {
    const fractal = authorSubnetFractal();
    const returned = fractal.operations.withCidrBlock('10.0.2.0/24');
    expect(returned).toBe(fractal.operations);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorSubnetFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-net', environment, provider: 'SaaS'}),
    ).toThrow(/No Subnet offer/);
  });

  it('serializes all candidate offers onto the Blueprint Services', () => {
    const subnet = authorSubnetFractal().blueprint.components.find(
      c => c.id.toString() === 'subnet',
    )!;

    // every candidate offer groups under the single IaaS Subnet Service.
    const serviceTypes = (subnet.services ?? [])
      .map(s => s.type.toString())
      .sort();
    expect(serviceTypes).toEqual(['NetworkAndCompute.IaaS.Subnet']);

    const offerTypes = (subnet.services ?? [])
      .flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'NetworkAndCompute.IaaS.ArubaSubnet',
      'NetworkAndCompute.IaaS.AwsSubnet',
      'NetworkAndCompute.IaaS.AzureSubnet',
      'NetworkAndCompute.IaaS.GcpSubnet',
      'NetworkAndCompute.IaaS.HetznerSubnet',
      'NetworkAndCompute.IaaS.OciSubnet',
      'NetworkAndCompute.IaaS.VspherePortGroup',
      'NetworkAndCompute.IaaS.VsphereVlan',
    ]);
  });
});
