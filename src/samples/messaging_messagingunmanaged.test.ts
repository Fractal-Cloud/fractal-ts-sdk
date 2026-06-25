/**
 * messaging_messagingunmanaged.test.ts
 *
 * M3 migration proof for the Messaging "Unmanaged" capability under the Fractal +
 * Interface model. Mirrors samples/storage_relationaldatabase.test.ts and
 * samples/network_and_compute_virtual_network_fractal.test.ts:
 *
 *   - An infra team authors ONE Fractal whose MessagingUnmanaged abstract
 *     component carries the candidate Offer (MessagingSaaSUnmanaged/SaaS).
 *   - The capability has no vendor-neutral knobs, so the dev does not set any
 *     neutral params — but the declared dependencies and links must still flow
 *     through to whichever offer the provider selects.
 *   - The Provider chosen at LiveSystem time selects the offer.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offer onto its Service.
 *   - An unknown provider throws `No Unmanaged offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {MessagingUnmanaged} from '../fractal/component/messaging/saas/unmanaged';
import {MessagingSaaSUnmanaged} from '../live_system/component/messaging/saas/unmanaged';
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
      .withInfrastructureDomain(InfrastructureDomain.Messaging)
      .withName(PascalCaseString.getBuilder().withValue('LinkedThing').build())
      .build(),
  )
  .withParameters(getParametersInstance())
  .build();

// ── Infra team: author the Fractal once. ─────────────────────────────────────
function authorMessagingFractal() {
  return createFractal({
    id: 'messaging',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed unmanaged messaging endpoint',
    boundedContextId,
    blueprint: bp => ({
      messaging: bp.add(
        MessagingUnmanaged.create({
          id: 'messaging',
          displayName: 'External Messaging Endpoint',
          offers: [MessagingSaaSUnmanaged],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: () => ({}),
  });
}

// ── Dev team: specialize through the Interface (no neutral knobs here). ───────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorMessagingFractal();
  return fractal.toLiveSystem({name: 'acme-messaging', environment, provider});
}

describe('MessagingUnmanaged Fractal — provider-driven offer swap', () => {
  it('selects the SaaS offer type/provider from the authored Fractal', () => {
    const ls = specialize('SaaS');
    const messaging = ls.components.find(c => c.id.toString() === 'messaging')!;
    expect(messaging).toBeDefined();
    expect(messaging.type.toString()).toBe('Messaging.SaaS.Unmanaged');
    expect(messaging.provider).toBe('SaaS');
    // No vendor sub-components for this offer.
    expect(ls.components.length).toBe(1);
  });

  it('flows declared deps and links to the offer the provider selects', () => {
    const messaging = specialize('SaaS').components.find(
      c => c.id.toString() === 'messaging',
    )!;

    // No vendor-neutral params on this capability.
    expect(messaging.parameters.toMap()).toEqual({});

    // declared dependency + link inherited by the offer
    expect(
      messaging.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
    ).toBe(true);
    expect(messaging.links.some(l => l.id.toString() === 'linked-thing')).toBe(
      true,
    );
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('SaaS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('messaging');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('SaaS');
  });

  it('serializes the candidate offer onto the Blueprint component Service', () => {
    const blueprint = authorMessagingFractal().blueprint;
    const messaging = blueprint.components.find(
      c => c.id.toString() === 'messaging',
    )!;

    expect(messaging.services).toBeDefined();
    const serviceTypes = messaging.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Messaging.SaaS.Unmanaged']);

    const offerTypes = messaging
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['Messaging.SaaS.Unmanaged']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorMessagingFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-messaging',
        environment,
        provider: 'AWS',
      }),
    ).toThrow(/No Unmanaged offer/);
  });
});
