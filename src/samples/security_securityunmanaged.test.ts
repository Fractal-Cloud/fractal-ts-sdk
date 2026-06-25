/**
 * security_securityunmanaged.test.ts
 *
 * M7 migration proof for the Security "Unmanaged" capability under the Fractal +
 * Interface model. Mirrors samples/identity_fractal.test.ts and
 * samples/messaging_broker.test.ts:
 *
 *   - An infra team authors ONE Fractal whose SecurityUnmanaged abstract
 *     component carries its candidate Offer (the `Unmanaged` SaaS offer).
 *   - A dev specializes through the Interface only, never naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. SaaS resolves to
 *     the Unmanaged offer; the declared dependency and link flow through
 *     identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offer onto its Service.
 *   - An unknown provider throws `No Unmanaged offer ...`.
 *
 * Because the unmanaged capability has a single SaaS offer (an unmanaged
 * component is inherently externally owned), provider-swap is demonstrated by
 * proving the SaaS provider selects the offer while any other provider is
 * rejected.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {SecurityUnmanaged} from '../fractal/component/security/saas/unmanaged';
import {Unmanaged} from '../live_system/component/security/saas/unmanaged';
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
function authorUnmanagedFractal() {
  return createFractal({
    id: 'security-unmanaged',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed unmanaged security component',
    boundedContextId,
    blueprint: bp => ({
      unmanaged: bp.add(
        SecurityUnmanaged.create({
          id: 'unmanaged',
          displayName: 'Unmanaged Security Component',
          offers: [Unmanaged],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: () => ({}),
  });
}

// ── Dev team: instantiate by provider, offer-free. ───────────────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorUnmanagedFractal();
  return fractal.toLiveSystem({name: 'acme-unmanaged', environment, provider});
}

describe('SecurityUnmanaged Fractal — provider-driven offer selection', () => {
  it('selects the Unmanaged SaaS offer from the authored Fractal', () => {
    const ls = specialize('SaaS');
    const unmanaged = ls.components.find(c => c.id.toString() === 'unmanaged')!;

    expect(unmanaged).toBeDefined();
    expect(unmanaged.type.toString()).toBe('Security.SaaS.Unmanaged');
    expect(unmanaged.provider).toBe('SaaS');
    // No vendor sub-components for this offer.
    expect(ls.components.length).toBe(1);
  });

  it('flows the declared deps and links to the offer the provider selects', () => {
    const unmanaged = specialize('SaaS').components.find(
      c => c.id.toString() === 'unmanaged',
    )!;

    expect(
      unmanaged.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
    ).toBe(true);
    expect(unmanaged.links.some(l => l.id.toString() === 'linked-thing')).toBe(
      true,
    );
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('SaaS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('security-unmanaged');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('SaaS');
  });

  it('serializes the candidate offer onto the Blueprint component Service', () => {
    const blueprint = authorUnmanagedFractal().blueprint;
    const unmanaged = blueprint.components.find(
      c => c.id.toString() === 'unmanaged',
    )!;

    expect(unmanaged.services).toBeDefined();
    const serviceTypes = unmanaged.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Security.SaaS.Unmanaged']);

    const offerTypes = unmanaged
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['Security.SaaS.Unmanaged']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorUnmanagedFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-unmanaged',
        environment,
        provider: 'AWS',
      }),
    ).toThrow(/No Unmanaged offer/);
  });
});
