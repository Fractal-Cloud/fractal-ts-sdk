/**
 * messaging_caasbroker.test.ts
 *
 * M3 migration proof for the Messaging "Broker" (CaaSBroker) capability under
 * the Fractal + Interface model. Mirrors
 * samples/storage_relationaldatabase.test.ts and
 * samples/network_and_compute_virtual_network_fractal.test.ts:
 *
 *   - An infra team authors ONE Fractal whose CaaSBroker abstract component
 *     carries the candidate Offers (Kafka/CaaS).
 *   - A dev specializes through the Interface only, never naming a vendor offer.
 *     The single Kafka offer exposes only vendor-only knobs (namespace,
 *     clusterName), so there are no neutral Interface ops here.
 *   - The Provider chosen at LiveSystem time selects the offer. The declared
 *     dependencies and links flow through to whichever offer is selected.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No Broker offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {CaaSBroker} from '../fractal/component/messaging/caas/broker';
import {Kafka} from '../live_system/component/messaging/caas/kafka';
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
function authorBrokerFractal() {
  return createFractal({
    id: 'broker',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed message broker',
    boundedContextId,
    blueprint: bp => ({
      broker: bp.add(
        CaaSBroker.create({
          id: 'broker',
          displayName: 'App Message Broker',
          offers: [Kafka],
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
  const fractal = authorBrokerFractal();
  return fractal.toLiveSystem({name: 'acme-broker', environment, provider});
}

describe('CaaSBroker Fractal — provider-driven offer selection', () => {
  it('selects the Kafka offer type/provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['CaaS', 'Messaging.CaaS.Kafka'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const broker = ls.components.find(c => c.id.toString() === 'broker')!;
      expect(broker).toBeDefined();
      expect(broker.type.toString()).toBe(expectedType);
      expect(broker.provider).toBe(provider);
      // No vendor sub-components for the Kafka offer.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows declared deps and links to whichever offer the provider selects', () => {
    const broker = specialize('CaaS').components.find(
      c => c.id.toString() === 'broker',
    )!;

    expect(
      broker.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
    ).toBe(true);
    expect(broker.links.some(l => l.id.toString() === 'linked-thing')).toBe(
      true,
    );
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('CaaS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('broker');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('CaaS');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorBrokerFractal().blueprint;
    const broker = blueprint.components.find(
      c => c.id.toString() === 'broker',
    )!;

    expect(broker.services).toBeDefined();
    const serviceTypes = broker.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Messaging.CaaS.Broker']);

    const offerTypes = broker
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['Messaging.CaaS.Kafka']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorBrokerFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-broker', environment, provider: 'AWS'}),
    ).toThrow(/No Broker offer/);
  });
});
