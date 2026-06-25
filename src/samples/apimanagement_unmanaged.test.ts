/**
 * apimanagement_unmanaged.test.ts
 *
 * M5 migration proof for the APIManagement "Unmanaged" capability under the
 * Fractal + Interface model. Mirrors samples/messaging_broker.test.ts and
 * samples/bigdata_distributeddataprocessing.test.ts:
 *
 *   - An infra team authors ONE Fractal whose ApiManagementUnmanaged abstract
 *     component carries the candidate Offers (ApiManagementSaaSUnmanaged/SaaS).
 *   - A dev consumes through the Interface only; this capability has no
 *     vendor-neutral knobs, so the Interface declares no neutral ops.
 *   - The Provider chosen at LiveSystem time selects the offer. Choosing SaaS
 *     resolves the offer; choosing any other provider throws — proving offer
 *     selection is provider-driven while declared dependencies and links flow
 *     through identically to whichever offer is selected.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No Unmanaged offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {ApiManagementUnmanaged} from '../fractal/component/api_management/saas/unmanaged';
import {ApiManagementSaaSUnmanaged} from '../live_system/component/api_management/saas/unmanaged';
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
      .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
      .withName(PascalCaseString.getBuilder().withValue('LinkedThing').build())
      .build(),
  )
  .withParameters(getParametersInstance())
  .build();

// ── Infra team: author the Fractal once. ─────────────────────────────────────
function authorUnmanagedFractal() {
  return createFractal({
    id: 'api-gateway',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed unmanaged API management endpoint',
    boundedContextId,
    blueprint: bp => ({
      gateway: bp.add(
        ApiManagementUnmanaged.create({
          id: 'api-gateway',
          displayName: 'API Gateway',
          offers: [ApiManagementSaaSUnmanaged],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    // ApiManagementUnmanaged has no vendor-neutral knobs — the Interface
    // exposes no neutral ops.
    operations: () => ({}),
  });
}

// ── Dev team: select a provider; no neutral specialization needed. ───────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorUnmanagedFractal();
  return fractal.toLiveSystem({name: 'acme-gateway', environment, provider});
}

describe('ApiManagementUnmanaged Fractal — provider-driven offer swap', () => {
  it('selects the SaaS offer type/provider from one authored Fractal', () => {
    const ls = specialize('SaaS');
    const gateway = ls.components.find(c => c.id.toString() === 'api-gateway')!;
    expect(gateway).toBeDefined();
    expect(gateway.type.toString()).toBe('APIManagement.SaaS.Unmanaged');
    expect(gateway.provider).toBe('SaaS');
    // No vendor sub-components for this offer.
    expect(ls.components.length).toBe(1);
  });

  it('flows declared deps and links to whichever offer the provider selects', () => {
    const gateway = specialize('SaaS').components.find(
      c => c.id.toString() === 'api-gateway',
    )!;

    expect(
      gateway.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
    ).toBe(true);
    expect(gateway.links.some(l => l.id.toString() === 'linked-thing')).toBe(
      true,
    );
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('SaaS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('api-gateway');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('SaaS');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorUnmanagedFractal().blueprint;
    const gateway = blueprint.components.find(
      c => c.id.toString() === 'api-gateway',
    )!;

    expect(gateway.services).toBeDefined();
    const serviceTypes = gateway.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['APIManagement.SaaS.Unmanaged']);

    const offerTypes = gateway
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['APIManagement.SaaS.Unmanaged']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorUnmanagedFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-gateway',
        environment,
        provider: 'Azure',
      }),
    ).toThrow(/No Unmanaged offer/);
  });
});
