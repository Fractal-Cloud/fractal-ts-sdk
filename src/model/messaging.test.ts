/**
 * messaging.test.ts — executable spec for the Messaging domain on the locked
 * Fractal model. Mirrors the decisions proven in secure_public_api.test.ts:
 *   - Blueprint is vendor-agnostic (abstract Components only).
 *   - Guardrails are locked at design time.
 *   - operations expose dev-open params that are NOT pre-locked.
 *   - LiveSystem is built purely by per-component offer selection.
 *   - A selected offer must satisfy its Component (else type error AND throw).
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {Broker, MessagingEntity} from './components/messaging';
import {AzureServiceBus, AzureServiceBusTopic} from './offers/messaging';

const environment = {id: 'test-env'};
const boundedContextId = {id: 'reusable-templates'};

/**
 * The canonical example fractal. Its broker locks `tier` to the free-form label
 * `'premium'` — NOT the ARM SKU name `'Premium'` — and every test in this file
 * that does not care about the tier uses it. Do NOT change this fixture to make a
 * tier test pass: an earlier attempt at the guardrail fix swapped it for a
 * no-tier fractal, which hid a regression that made this fractal provision a
 * Premium namespace.
 */
function authorFractal() {
  return authorFractalWithTier('premium');
}

/**
 * Same fractal, with the broker's `tier` guardrail parameterized: `undefined`
 * authors a broker with NO locked tier at all. Used to separate "the offer's own
 * default" from "an architect's locked tier", which the offer must not contradict.
 */
function authorFractalWithTier(tier: string | undefined) {
  return createFractal({
    id: 'event-backbone',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const base = Broker({id: 'broker'});
      const broker = bp.add(
        (tier === undefined ? base : base.withTier(tier)).withEncryption(
          'at-rest',
        ),
      );
      const ordersTopic = bp.add(
        MessagingEntity({id: 'orders-topic'})
          .withMessageRetentionHours(72)
          .withDeadLetterEnabled(true)
          .withMaxDeliveryAttempts(5)
          .dependsOn(broker),
      );
      const shipmentsTopic = bp.add(
        MessagingEntity({id: 'shipments-topic'})
          .withMessageRetentionHours(48)
          .dependsOn(broker),
      );
      return {broker, ordersTopic, shipmentsTopic};
    },
    operations: s => ({
      // dev-open: partitionCount is NOT pre-locked as a guardrail
      withOrdersPartitions: (n: number) =>
        s.ordersTopic.set('partitionCount', n),
      withShipmentsPartitions: (n: number) =>
        s.shipmentsTopic.set('partitionCount', n),
    }),
  });
}

const fullSelect = () => ({
  broker: AzureServiceBus({resourceGroup: 'acme', region: 'westeurope'}),
  'orders-topic': AzureServiceBusTopic({}),
  'shipments-topic': AzureServiceBusTopic({}),
});

/**
 * A broker with NO topics — the "namespace as infrastructure, entities created at
 * runtime by the application" shape. It is the only Live System in which a Basic
 * namespace is legal, since a Basic namespace cannot host a topic. `tier` is the
 * locked guardrail value, or undefined for no locked tier at all.
 */
const brokerOnlyFractal = (tier?: string) =>
  createFractal({
    id: 'broker-only',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const base = Broker({id: 'broker'});
      return {broker: bp.add(tier === undefined ? base : base.withTier(tier))};
    },
    operations: () => ({}),
  });

const brokerOnlyComponent = (
  broker: ReturnType<typeof AzureServiceBus>,
  tier?: string,
) =>
  brokerOnlyFractal(tier)
    .toLiveSystem({name: 'acme-prod', environment, select: {broker}})
    .components.find(c => c.id === 'broker')!;

describe('Messaging domain — event-backbone', () => {
  it('blueprint is vendor-agnostic: abstract Components, no offers', () => {
    const bp = authorFractal().blueprint;
    expect(bp.components.map(c => c.component)).toEqual([
      'Messaging.Broker',
      'Messaging.MessagingEntity',
      'Messaging.MessagingEntity',
    ]);
    for (const c of bp.components) {
      expect(c).not.toHaveProperty('offers');
    }
  });

  it('guardrails are recorded and locked; messageRetentionHours flows', () => {
    const orders = authorFractal().blueprint.components.find(
      c => c.id === 'orders-topic',
    )!;
    expect(orders.parameters.messageRetentionHours).toBe(72);
    expect(orders.locked).toContain('messageRetentionHours');
    expect(orders.locked).toContain('deadLetterEnabled');
    // partitionCount is dev-open, so it must NOT be locked at author time
    expect(orders.locked).not.toContain('partitionCount');

    const broker = authorFractal().blueprint.components.find(
      c => c.id === 'broker',
    )!;
    expect(broker.parameters.tier).toBe('premium');
    expect(broker.locked).toContain('encryption');
  });

  it('entity depends on the broker', () => {
    const bp = authorFractal().blueprint;
    const orders = bp.components.find(c => c.id === 'orders-topic')!;
    const shipments = bp.components.find(c => c.id === 'shipments-topic')!;
    expect(orders.dependencies).toContain('broker');
    expect(shipments.dependencies).toContain('broker');
  });

  it('specialize sets dev-open param and builds an all-Azure LiveSystem', () => {
    const ls = authorFractal()
      .specialize()
      .withOrdersPartitions(8)
      .withShipmentsPartitions(4)
      .toLiveSystem({name: 'acme-prod', environment, select: fullSelect()});

    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));

    // offer types + providers
    expect(byId['broker'].type).toBe('Messaging.PaaS.AzureServiceBus');
    expect(byId['broker'].provider).toBe('Azure');
    expect(byId['orders-topic'].type).toBe(
      'Messaging.PaaS.AzureServiceBusTopic',
    );
    expect(byId['orders-topic'].provider).toBe('Azure');

    // dev-open neutral param flowed
    expect(byId['orders-topic'].parameters.partitionCount).toBe(8);
    // guardrail flowed into the live component
    expect(byId['orders-topic'].parameters.messageRetentionHours).toBe(72);
    // vendor config merged in by the offer
    expect(byId['broker'].parameters.resourceGroup).toBe('acme');
    // blueprint structure preserved
    expect(byId['orders-topic'].dependencies).toContain('broker');
  });

  // The Azure catalogue ships NO ServiceBus *queue* offer — `AzureServiceBusTopic`
  // is the only Azure `Messaging.MessagingEntity`. A Basic-tier namespace cannot
  // host topics at all (ARM 400, SubCode=40000), so the agent's Basic default can
  // never serve any entity this SDK is able to create. The namespace offer must
  // therefore ship a tier that works with its own sibling offer.
  it('namespace defaults to a tier that can host topics, and stays overridable', () => {
    const brokerOf = (broker: ReturnType<typeof AzureServiceBus>) =>
      authorFractal()
        .toLiveSystem({
          name: 'acme-prod',
          environment,
          select: {...fullSelect(), broker},
        })
        .components.find(c => c.id === 'broker')!;

    const asShipped = brokerOf(AzureServiceBus({resourceGroup: 'acme'}));
    expect(asShipped.parameters.skuTier).toBe('Standard');
    // The default must not smother the offer's other vendor knobs.
    expect(asShipped.parameters.resourceGroup).toBe('acme');

    // An explicit tier always wins over the default.
    for (const tier of ['Standard', 'Premium'] as const) {
      expect(
        brokerOf(AzureServiceBus({resourceGroup: 'acme', skuTier: tier}))
          .parameters.skuTier,
      ).toBe(tier);
    }

    // Basic also wins over the default, and stays reachable for exactly the case
    // the original assertion named — "a queue-only namespace driven outside this
    // SDK", i.e. one with no topics. Asserted on a topic-free Live System because
    // Basic + topics is now refused outright (see the test below); the claim is
    // unchanged, only the Live System shape it is made in.
    expect(
      brokerOnlyComponent(
        AzureServiceBus({resourceGroup: 'acme', skuTier: 'Basic'}),
      ).parameters.skuTier,
    ).toBe('Basic');
  });

  // `Broker().withTier()` sets the LOCKED guardrail `tier` (core.ts: "locked;
  // devs cannot override"), and it takes a FREE-FORM string on a deliberately
  // vendor-agnostic component. The offer used to append `skuTier: 'Standard'`
  // regardless, so a broker locked to the SKU name `'Basic'` shipped
  // `tier: 'Basic'` and `skuTier: 'Standard'` at once and one intent was lost
  // silently. The lock now decides the SKU — but ONLY on an exact ARM SKU
  // spelling, because a free-form label is not a vendor enum.
  describe('locked `tier` guardrail vs the skuTier default', () => {
    // Broker-only, because a locked SKU of 'Basic' is only legal without topics.
    const brokerLockedTo = (
      tier: string,
      broker = AzureServiceBus({resourceGroup: 'acme'}),
    ) => brokerOnlyComponent(broker, tier);

    it('an exact SKU spelling in a locked tier decides the SKU', () => {
      const basic = brokerLockedTo('Basic');
      expect(basic.parameters.tier).toBe('Basic');
      expect(basic.parameters.skuTier).toBe('Basic');

      const premium = brokerLockedTo('Premium');
      expect(premium.parameters.skuTier).toBe('Premium');
    });

    // THE REGRESSION GUARD. `withTier` is free-form, and 'premium' / 'basic' are
    // ordinary words for a service tier or an environment class — not statements
    // about an Azure SKU. Matching them case-insensitively made this fractal
    // provision a Premium namespace (~2 orders of magnitude above Standard) and,
    // because any tier change makes the agent delete the namespace, destroy the
    // live one to get there. Only an exact spelling counts.
    it.each(['premium', 'basic', 'standard', ' Premium ', 'PREMIUM', 'gold'])(
      'a locked tier of %o is a label, not a SKU, and leaves the default alone',
      label => {
        const broker = brokerLockedTo(label);
        expect(broker.parameters.tier).toBe(label);
        expect(broker.parameters.skuTier).toBe('Standard');
      },
    );

    it('an offer config that contradicts an exact locked SKU throws', () => {
      expect(() =>
        brokerLockedTo(
          'Basic',
          AzureServiceBus({resourceGroup: 'acme', skuTier: 'Premium'}),
        ),
      ).toThrow(/locked guardrail/);
    });

    it('an offer config that agrees with an exact locked SKU is accepted', () => {
      expect(
        brokerLockedTo(
          'Basic',
          AzureServiceBus({resourceGroup: 'acme', skuTier: 'Basic'}),
        ).parameters.skuTier,
      ).toBe('Basic');
    });

    // A free-form label never blocks the vendor knob, because it never claimed
    // the SKU in the first place.
    it('an offer config wins over a locked label that names no SKU', () => {
      expect(
        brokerLockedTo(
          'premium',
          AzureServiceBus({resourceGroup: 'acme', skuTier: 'Premium'}),
        ).parameters.skuTier,
      ).toBe('Premium');
    });

    // An UNLOCKED `tier` must not decide a vendor SKU: it is dev-open, so it is
    // not an architect's design-time decision, and letting it pick the SKU would
    // hand a recurring charge and a destroy-and-recreate to a `.set()` call.
    it('an unlocked tier never decides the SKU', () => {
      const ls = createFractal({
        id: 'dev-open-tier',
        version: {major: 1, minor: 0, patch: 0},
        boundedContextId,
        blueprint: bp => ({broker: bp.add(Broker({id: 'broker'}))}),
        operations: s => ({
          withTier: (v: string) => s.broker.set('tier', v),
        }),
      })
        .specialize()
        .withTier('Premium')
        .toLiveSystem({
          name: 'acme-prod',
          environment,
          select: {broker: AzureServiceBus({resourceGroup: 'acme'})},
        });
      const broker = ls.components.find(c => c.id === 'broker')!;
      expect(broker.parameters.tier).toBe('Premium');
      expect(broker.parameters.skuTier).toBe('Standard');
    });
  });

  // A Basic namespace cannot host a topic (ARM 400 SubCode=40000) and
  // `AzureServiceBusTopic` is the only Azure MessagingEntity in the catalogue, so
  // "Basic namespace + topic" is a deployment the SDK knows cannot work. Emitting
  // it silently is worse than refusing it.
  it('refuses a Basic namespace that a topic in the same Live System depends on', () => {
    expect(() =>
      authorFractal().toLiveSystem({
        name: 'acme-prod',
        environment,
        select: {
          ...fullSelect(),
          broker: AzureServiceBus({resourceGroup: 'acme', skuTier: 'Basic'}),
        },
      }),
    ).toThrow(/Basic.*cannot host/s);
  });

  it('selecting an offer that does not satisfy the Component is a type error AND throws', () => {
    expect(() =>
      authorFractal().toLiveSystem({
        name: 'x',
        environment,
        select: {
          ...fullSelect(),
          // @ts-expect-error a MessagingEntity topic cannot satisfy Messaging.Broker
          broker: AzureServiceBusTopic({}),
        },
      }),
    ).toThrow(/does not satisfy/);
  });
});
