/**
 * security_group_fractal.test.ts
 *
 * M1 NetworkAndCompute migration proof for the SecurityGroup capability, mirroring
 * the M0 reference (`foundations_pattern.test.ts`, `identity_fractal.test.ts`).
 *
 * The contract being proven:
 *   - An infra team authors ONE Fractal whose `securityGroup` abstract component
 *     carries every candidate Offer (AWS, Azure, GCP, Hetzner, OCI, Aruba,
 *     RedHat/OpenShift).
 *   - A dev team specializes ONLY through the Interface (description, ingressRules)
 *     and never names a vendor Offer.
 *   - The Provider chosen at `toLiveSystem` time selects the concrete Offer.
 *     Swapping the provider changes only the offer `type`/`provider`, leaving the
 *     neutral params, declared dependencies and links byte-for-byte identical.
 *   - `toLiveSystem` returns a real, validated LiveSystem.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {
  SecurityGroup,
  IngressRule,
} from '../fractal/component/network_and_compute/iaas/security_group';
import {AwsSecurityGroup} from '../live_system/component/network_and_compute/iaas/security_group';
import {AzureNsg} from '../live_system/component/network_and_compute/iaas/azure_nsg';
import {GcpFirewall} from '../live_system/component/network_and_compute/iaas/gcp_firewall';
import {HetznerFirewall} from '../live_system/component/network_and_compute/iaas/hetzner_firewall';
import {OciSecurityList} from '../live_system/component/network_and_compute/iaas/oci_security_list';
import {ArubaSecurityGroup} from '../live_system/component/network_and_compute/iaas/aruba_security_group';
import {OpenshiftSecurityGroup} from '../live_system/component/network_and_compute/caas/openshift_security_group';
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
  .withValue(kebab('some-subnet'))
  .build();

const declaredLink = getLinkBuilder()
  .withId(getComponentIdBuilder().withValue(kebab('linked-vm')).build())
  .withType(
    getComponentTypeBuilder()
      .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
      .withName(
        PascalCaseString.getBuilder().withValue('VirtualMachine').build(),
      )
      .build(),
  )
  .withParameters(getParametersInstance())
  .build();

const INGRESS: IngressRule[] = [
  {protocol: 'tcp', fromPort: 443, toPort: 443, sourceCidr: '0.0.0.0/0'},
];

const NEUTRAL_KEYS = ['description', 'ingressRules'];

// ── Infra team: author the Fractal once. ─────────────────────────────────────
// The SecurityGroup abstract component declares ALL candidate offers. The
// interface exposes vendor-neutral ops only.
function authorSecurityFractal() {
  return createFractal({
    id: 'security',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed security group',
    boundedContextId,
    blueprint: bp => ({
      securityGroup: bp.add(
        SecurityGroup.create({
          id: 'sg',
          displayName: 'App Security Group',
          offers: [
            AwsSecurityGroup,
            AzureNsg({location: 'westeurope', resourceGroup: 'rg-app'}),
            GcpFirewall,
            HetznerFirewall,
            OciSecurityList({compartmentId: 'ocid1.compartment.oc1..aaaa'}),
            ArubaSecurityGroup({name: 'app-sg'}),
            OpenshiftSecurityGroup({
              name: 'app-netpol',
              policyType: 'Ingress',
              podSelector: 'app=web',
            }),
          ],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withDescription: (description: string) =>
        bp.securityGroup.set('description', description),
      withIngressRules: (rules: IngressRule[]) =>
        bp.securityGroup.set('ingressRules', rules),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: string) {
  const fractal = authorSecurityFractal();
  fractal.operations
    .withDescription('Allow HTTPS traffic')
    .withIngressRules(INGRESS);
  return fractal.toLiveSystem({name: 'acme-prod', environment, provider});
}

describe('SecurityGroupFractal — provider-driven offer swap', () => {
  it('selects the matching offer type/provider for every candidate provider', () => {
    const cases: Array<[string, string, string]> = [
      ['AWS', 'NetworkAndCompute.IaaS.AwsSecurityGroup', 'AWS'],
      ['Azure', 'NetworkAndCompute.IaaS.AzureNsg', 'Azure'],
      ['GCP', 'NetworkAndCompute.IaaS.GcpFirewall', 'GCP'],
      ['Hetzner', 'NetworkAndCompute.IaaS.HetznerFirewall', 'Hetzner'],
      ['OCI', 'NetworkAndCompute.IaaS.OciSecurityList', 'OCI'],
      ['Aruba', 'NetworkAndCompute.IaaS.ArubaSecurityGroup', 'Aruba'],
      ['RedHat', 'NetworkAndCompute.CaaS.OpenshiftSecurityGroup', 'RedHat'],
    ];

    for (const [provider, expectedType, expectedProvider] of cases) {
      const sg = specialize(provider).components.find(
        c => c.id.toString() === 'sg',
      )!;
      expect(sg).toBeDefined();
      expect(sg.type.toString()).toBe(expectedType);
      expect(sg.provider).toBe(expectedProvider);
    }
  });

  it('flows identical neutral params, deps and links to whichever offer is selected', () => {
    const aws = specialize('AWS').components.find(
      c => c.id.toString() === 'sg',
    )!;
    const azure = specialize('Azure').components.find(
      c => c.id.toString() === 'sg',
    )!;

    // identical neutral params across providers
    for (const key of NEUTRAL_KEYS) {
      expect(aws.parameters.getOptionalFieldByName(key)).toEqual(
        azure.parameters.getOptionalFieldByName(key),
      );
    }
    // and the values are the ones the dev set through the interface
    expect(aws.parameters.getOptionalFieldByName('description')).toBe(
      'Allow HTTPS traffic',
    );
    expect(aws.parameters.getOptionalFieldByName('ingressRules')).toEqual(
      INGRESS,
    );

    // declared dependency inherited by both offers
    expect(aws.dependencies.some(d => d.id.toString() === 'some-subnet')).toBe(
      true,
    );
    expect(
      azure.dependencies.some(d => d.id.toString() === 'some-subnet'),
    ).toBe(true);

    // declared link inherited by both offers
    expect(aws.links.some(l => l.id.toString() === 'linked-vm')).toBe(true);
    expect(azure.links.some(l => l.id.toString() === 'linked-vm')).toBe(true);
  });

  it('carries vendor-only knobs only on the offer that declares them', () => {
    const azure = specialize('Azure').components.find(
      c => c.id.toString() === 'sg',
    )!;
    const aws = specialize('AWS').components.find(
      c => c.id.toString() === 'sg',
    )!;

    // Azure-only knobs present on the Azure offer
    expect(azure.parameters.getOptionalFieldByName('location')).toBe(
      'westeurope',
    );
    expect(azure.parameters.getOptionalFieldByName('resourceGroup')).toBe(
      'rg-app',
    );
    // ...and absent from the AWS offer (NOT on the neutral Interface)
    expect(aws.parameters.getOptionalFieldByName('location')).toBeNull();
    expect(aws.parameters.getOptionalFieldByName('resourceGroup')).toBeNull();
  });

  it('produces a real, validated LiveSystem', () => {
    const ls = specialize('AWS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('security');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('AWS');
  });
});

describe('SecurityGroupFractal — interface and offer-selection guarantees', () => {
  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorSecurityFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-prod', environment, provider: 'SaaS'}),
    ).toThrow(/No SecurityGroup offer/);
  });

  it('serializes every candidate offer onto the Blueprint Services', () => {
    const sg = authorSecurityFractal().blueprint.components.find(
      c => c.id.toString() === 'sg',
    )!;
    const offerTypes = (sg.services ?? [])
      .flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'NetworkAndCompute.CaaS.OpenshiftSecurityGroup',
      'NetworkAndCompute.IaaS.ArubaSecurityGroup',
      'NetworkAndCompute.IaaS.AwsSecurityGroup',
      'NetworkAndCompute.IaaS.AzureNsg',
      'NetworkAndCompute.IaaS.GcpFirewall',
      'NetworkAndCompute.IaaS.HetznerFirewall',
      'NetworkAndCompute.IaaS.OciSecurityList',
    ]);

    // The IaaS offers group under one Service, the CaaS offer under another.
    const serviceTypes = (sg.services ?? []).map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual([
      'NetworkAndCompute.CaaS.SecurityGroup',
      'NetworkAndCompute.IaaS.SecurityGroup',
    ]);
  });
});
