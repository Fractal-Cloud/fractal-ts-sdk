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

function authorFractal() {
  return createFractal({
    id: 'event-backbone',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const broker = bp.add(
        Broker({id: 'broker'})
          .withTier('premium')
          .withRegion('westeurope')
          .withEncryption('at-rest'),
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
  broker: AzureServiceBus({resourceGroup: 'acme'}),
  'orders-topic': AzureServiceBusTopic({}),
  'shipments-topic': AzureServiceBusTopic({}),
});

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
