/**
 * messaging_caasmessagingentity.test.ts
 *
 * M3 migration proof for the Messaging "CaaSMessagingEntity" capability under the
 * Fractal + Interface model. Mirrors
 * samples/storage_relationaldatabase.test.ts and
 * samples/network_and_compute_virtual_network_fractal.test.ts:
 *
 *   - An infra team authors ONE Fractal whose CaaSMessagingEntity abstract
 *     component carries the candidate Offer (KafkaTopic/CaaS).
 *   - The capability exposes NO vendor-neutral Interface ops (neutral keys: []) —
 *     every knob (e.g. KafkaTopic's `namespace`) is offer-specific.
 *   - The CaaSMessagingEntity logically depends on a CaaSBroker; the infra team
 *     wires that dependency when authoring the Fractal.
 *   - The Provider chosen at LiveSystem time selects the offer. The declared
 *     dependencies and links flow through to whichever offer the provider selects.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No Entity offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {CaaSMessagingEntity} from '../fractal/component/messaging/caas/entity';
import {KafkaTopic} from '../live_system/component/messaging/caas/kafka_topic';
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

// A dependency (the hosting CaaSBroker) and a link the abstract component
// declares — both must be inherited by whichever offer the provider selects.
const brokerDependencyId = getComponentIdBuilder()
  .withValue(kebab('caas-broker'))
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
function authorEntityFractal() {
  return createFractal({
    id: 'topic',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed messaging entity',
    boundedContextId,
    blueprint: bp => ({
      topic: bp.add(
        CaaSMessagingEntity.create({
          id: 'topic',
          displayName: 'App Messaging Entity',
          offers: [KafkaTopic],
          dependencies: [{id: brokerDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    // No vendor-neutral Interface ops: the only knob (namespace) is offer-specific.
    operations: () => ({}),
  });
}

// ── Dev team: specialize through the Interface (offer-free). ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorEntityFractal();
  return fractal.toLiveSystem({name: 'acme-topic', environment, provider});
}

describe('CaaSMessagingEntity Fractal — provider-driven offer swap', () => {
  it('selects the CaaS KafkaTopic offer from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['CaaS', 'Messaging.CaaS.KafkaTopic'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const topic = ls.components.find(c => c.id.toString() === 'topic')!;
      expect(topic).toBeDefined();
      expect(topic.type.toString()).toBe(expectedType);
      expect(topic.provider).toBe(provider);
      // No vendor sub-components for this offer.
      expect(ls.components.length).toBe(1);
    }
  });

  it('carries no vendor-neutral params, flows declared deps and links to the selected offer', () => {
    const topic = specialize('CaaS').components.find(
      c => c.id.toString() === 'topic',
    )!;

    // Neutral keys: [] — nothing set through the Interface.
    expect(topic.parameters.getOptionalFieldByName('namespace')).toBeNull();

    // declared dependency + link inherited by the offer
    expect(
      topic.dependencies.some(d => d.id.toString() === 'caas-broker'),
    ).toBe(true);
    expect(topic.links.some(l => l.id.toString() === 'linked-thing')).toBe(
      true,
    );
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('CaaS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('topic');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('CaaS');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorEntityFractal().blueprint;
    const topic = blueprint.components.find(c => c.id.toString() === 'topic')!;

    expect(topic.services).toBeDefined();
    const serviceTypes = topic.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Messaging.CaaS.Entity']);

    const offerTypes = topic
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['Messaging.CaaS.KafkaTopic']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorEntityFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-topic', environment, provider: 'AWS'}),
    ).toThrow(/No Entity offer/);
  });
});
