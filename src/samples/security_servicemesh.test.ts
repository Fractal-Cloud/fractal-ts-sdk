/**
 * security_servicemesh.test.ts
 *
 * M7 migration proof for the Security "ServiceMesh" capability under the
 * Fractal + Interface model. Mirrors samples/identity_fractal.test.ts and
 * samples/messaging_broker.test.ts:
 *
 *   - An infra team authors ONE Fractal whose ServiceMesh abstract component
 *     carries the candidate Offers (Ocelot on CaaS).
 *   - A dev specializes through the Interface only (here: declared dependencies
 *     and links flow through), never naming a vendor offer. ServiceMesh has no
 *     vendor-neutral knobs (neutral keys = []), so every Ocelot-specific knob
 *     (namespace, host, cors, ...) is an offer concern, not an Interface op.
 *   - The Provider chosen at LiveSystem time selects the offer. CaaS resolves to
 *     Ocelot; an unknown provider throws `No ServiceMesh offer ...`.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {ServiceMesh} from '../fractal/component/security/caas/service_mesh';
import {Ocelot} from '../live_system/component/security/caas/ocelot';
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
      .withInfrastructureDomain(InfrastructureDomain.Security)
      .withName(PascalCaseString.getBuilder().withValue('LinkedThing').build())
      .build(),
  )
  .withParameters(getParametersInstance())
  .build();

// ── Infra team: author the Fractal once. ─────────────────────────────────────
// The ServiceMesh abstract component declares the candidate offers (Ocelot on
// CaaS). ServiceMesh exposes no vendor-neutral knobs, so the Interface only
// governs structural concerns inherited from the abstract component.
function authorServiceMeshFractal() {
  return createFractal({
    id: 'service-mesh',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed service mesh',
    boundedContextId,
    blueprint: bp => ({
      mesh: bp.add(
        ServiceMesh.create({
          id: 'service-mesh',
          displayName: 'Service Mesh',
          offers: [Ocelot],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: () => ({}),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorServiceMeshFractal();
  return fractal.toLiveSystem({name: 'acme-mesh', environment, provider});
}

describe('ServiceMesh Fractal — provider-driven offer selection', () => {
  it('selects Ocelot on CaaS from the authored Fractal', () => {
    const ls = specialize('CaaS');
    const mesh = ls.components.find(c => c.id.toString() === 'service-mesh')!;
    expect(mesh).toBeDefined();
    expect(mesh.type.toString()).toBe('Security.CaaS.Ocelot');
    expect(mesh.provider).toBe('CaaS');
    // No vendor sub-components for Ocelot.
    expect(ls.components.length).toBe(1);
  });

  it('inherits declared dependencies and links on the selected offer', () => {
    const mesh = specialize('CaaS').components.find(
      c => c.id.toString() === 'service-mesh',
    )!;
    expect(
      mesh.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
    ).toBe(true);
    expect(mesh.links.some(l => l.id.toString() === 'linked-thing')).toBe(true);
  });

  it('exposes no vendor-neutral parameters (Ocelot knobs are offer-only)', () => {
    const mesh = specialize('CaaS').components.find(
      c => c.id.toString() === 'service-mesh',
    )!;
    for (const key of [
      'namespace',
      'cookieMaxAgeSec',
      'corsOrigins',
      'hostOwnerEmail',
      'host',
    ]) {
      expect(mesh.parameters.getOptionalFieldByName(key)).toBeNull();
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('CaaS');
    expect(typeof ls.deploy).toBe('function');
    expect(ls.fractalId.toString()).toContain('service-mesh');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('CaaS');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorServiceMeshFractal().blueprint;
    const mesh = blueprint.components.find(
      c => c.id.toString() === 'service-mesh',
    )!;

    expect(mesh.services).toBeDefined();
    const serviceTypes = mesh.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Security.CaaS.ServiceMesh']);

    const offerTypes = mesh
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['Security.CaaS.Ocelot']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorServiceMeshFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-mesh', environment, provider: 'AWS'}),
    ).toThrow(/No ServiceMesh offer/);
  });
});
