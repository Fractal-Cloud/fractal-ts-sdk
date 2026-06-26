/**
 * basic_messaging.test.ts
 *
 * Fractal + Interface migration of the basic_messaging sample. Mirrors
 * samples/messaging_broker.test.ts and samples/identity_fractal.test.ts:
 *
 *   - An infra team authors ONE Fractal whose abstract `Broker` carries the
 *     candidate broker Offers (AzureServiceBus/Azure, GcpPubSub/GCP) and whose
 *     abstract `MessagingEntity` topics carry the candidate entity Offers
 *     (AzureServiceBusTopic/Azure, GcpPubSubTopic/GCP). Each entity declares a
 *     blueprint dependency on the broker.
 *   - A dev specializes through the Interface only (`azureRegion`,
 *     `azureResourceGroup`, `sku`), never naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer per component.
 *     Swapping the provider changes only the offer `type`/`provider`; the neutral
 *     params and the broker dependency flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto each Service.
 *   - An unknown provider throws.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {Broker} from '../fractal/component/messaging/paas/broker';
import {MessagingEntity} from '../fractal/component/messaging/paas/entity';
import {AzureServiceBus} from '../live_system/component/messaging/paas/azure_service_bus';
import {AzureServiceBusTopic} from '../live_system/component/messaging/paas/azure_service_bus_topic';
import {GcpPubSub} from '../live_system/component/messaging/paas/gcp_pubsub';
import {GcpPubSubTopic} from '../live_system/component/messaging/paas/gcp_pubsub_topic';
import {getComponentIdBuilder} from '../component/id';
import {KebabCaseString} from '../values/kebab_case_string';
import {OwnerType} from '../values/owner_type';
import {OwnerId} from '../values/owner_id';
import {getBoundedContextIdBuilder} from '../bounded_context/id';
import {getEnvironmentBuilder} from '../environment/entity';
import {getEnvironmentIdBuilder} from '../environment/id';
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

// The broker's component id — each entity declares a blueprint dependency on it.
const brokerComponentId = getComponentIdBuilder()
  .withValue(kebab('event-broker'))
  .build();

// ── Infra team: author the Fractal once. ─────────────────────────────────────
function authorMessagingFractal() {
  return createFractal({
    id: 'basic-messaging',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed message broker with two topics',
    boundedContextId,
    blueprint: bp => ({
      broker: bp.add(
        Broker.create({
          id: 'event-broker',
          displayName: 'Event Broker',
          offers: [AzureServiceBus, GcpPubSub],
        }),
      ),
      ordersTopic: bp.add(
        MessagingEntity.create({
          id: 'orders-topic',
          displayName: 'Orders Topic',
          offers: [AzureServiceBusTopic, GcpPubSubTopic],
          dependencies: [{id: brokerComponentId}],
        }),
      ),
      notificationsTopic: bp.add(
        MessagingEntity.create({
          id: 'notifications-topic',
          displayName: 'Notifications Topic',
          offers: [AzureServiceBusTopic, GcpPubSubTopic],
          dependencies: [{id: brokerComponentId}],
        }),
      ),
    }),
    operations: bp => ({
      withAzureRegion: (region: string) => {
        bp.broker.set('azureRegion', region);
        bp.ordersTopic.set('azureRegion', region);
        bp.notificationsTopic.set('azureRegion', region);
      },
      withAzureResourceGroup: (rg: string) => {
        bp.broker.set('azureResourceGroup', rg);
        bp.ordersTopic.set('azureResourceGroup', rg);
        bp.notificationsTopic.set('azureResourceGroup', rg);
      },
      withSku: (sku: string) => bp.broker.set('sku', sku),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorMessagingFractal();
  fractal.operations
    .withAzureRegion('westeurope')
    .withAzureResourceGroup('my-rg')
    .withSku('Standard');
  return fractal.toLiveSystem({name: 'acme-messaging', environment, provider});
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('basic_messaging Fractal — provider-driven offer swap', () => {
  it('selects a broker + topic offer per provider from one authored Fractal', () => {
    const cases: Array<{
      provider: LiveSystemComponent.Provider;
      brokerType: string;
      topicType: string;
    }> = [
      {
        provider: 'Azure',
        brokerType: 'Messaging.PaaS.ServiceBus',
        topicType: 'Messaging.PaaS.ServiceBusTopic',
      },
      {
        provider: 'GCP',
        brokerType: 'Messaging.PaaS.PubSub',
        topicType: 'Messaging.PaaS.PubSubTopic',
      },
    ];

    for (const {provider, brokerType, topicType} of cases) {
      const ls = specialize(provider);

      const broker = ls.components.find(
        c => c.id.toString() === 'event-broker',
      )!;
      expect(broker).toBeDefined();
      expect(broker.type.toString()).toBe(brokerType);
      expect(broker.provider).toBe(provider);

      const orders = ls.components.find(
        c => c.id.toString() === 'orders-topic',
      )!;
      const notifications = ls.components.find(
        c => c.id.toString() === 'notifications-topic',
      )!;
      expect(orders.type.toString()).toBe(topicType);
      expect(notifications.type.toString()).toBe(topicType);
      expect(orders.provider).toBe(provider);
      expect(notifications.provider).toBe(provider);

      // broker + two topics, no vendor sub-components for these offers.
      expect(ls.components.length).toBe(3);
    }
  });

  it('carries the broker dependency into each topic offer for every provider', () => {
    for (const provider of ['Azure', 'GCP'] as LiveSystemComponent.Provider[]) {
      const ls = specialize(provider);
      for (const id of ['orders-topic', 'notifications-topic']) {
        const topic = ls.components.find(c => c.id.toString() === id)!;
        const depIds = topic.dependencies.map(d => d.id.toString());
        expect(depIds).toContain('event-broker');
      }
    }
  });

  it('preserves topic IDs and display names across the offer swap', () => {
    for (const provider of ['Azure', 'GCP'] as LiveSystemComponent.Provider[]) {
      const ls = specialize(provider);
      const orders = ls.components.find(
        c => c.id.toString() === 'orders-topic',
      )!;
      const notifications = ls.components.find(
        c => c.id.toString() === 'notifications-topic',
      )!;
      expect(orders.displayName).toBe('Orders Topic');
      expect(notifications.displayName).toBe('Notifications Topic');
    }
  });

  it('flows identical neutral params to whichever offer the provider selects', () => {
    const azureBroker = specialize('Azure').components.find(
      c => c.id.toString() === 'event-broker',
    )!;
    const gcpBroker = specialize('GCP').components.find(
      c => c.id.toString() === 'event-broker',
    )!;

    expect(azureBroker.parameters.getOptionalFieldByName('azureRegion')).toBe(
      'westeurope',
    );
    expect(
      azureBroker.parameters.getOptionalFieldByName('azureResourceGroup'),
    ).toBe('my-rg');
    expect(azureBroker.parameters.getOptionalFieldByName('sku')).toBe(
      'Standard',
    );

    expect(
      azureBroker.parameters.getOptionalFieldByName('azureRegion'),
    ).toEqual(gcpBroker.parameters.getOptionalFieldByName('azureRegion'));
    expect(
      azureBroker.parameters.getOptionalFieldByName('azureResourceGroup'),
    ).toEqual(
      gcpBroker.parameters.getOptionalFieldByName('azureResourceGroup'),
    );

    // topics receive the vendor-neutral azure params too
    const azureOrders = specialize('Azure').components.find(
      c => c.id.toString() === 'orders-topic',
    )!;
    expect(azureOrders.parameters.getOptionalFieldByName('azureRegion')).toBe(
      'westeurope',
    );
    expect(
      azureOrders.parameters.getOptionalFieldByName('azureResourceGroup'),
    ).toBe('my-rg');
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('Azure');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('basic-messaging');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Azure');
  });

  it('serializes candidate offers onto each Blueprint component Service', () => {
    const blueprint = authorMessagingFractal().blueprint;

    const broker = blueprint.components.find(
      c => c.id.toString() === 'event-broker',
    )!;
    expect(broker.services).toBeDefined();
    expect(broker.services!.map(s => s.type.toString()).sort()).toEqual([
      'Messaging.PaaS.Broker',
    ]);
    expect(
      broker
        .services!.flatMap(s => s.offers)
        .map(o => o.type.toString())
        .sort(),
    ).toEqual(['Messaging.PaaS.PubSub', 'Messaging.PaaS.ServiceBus']);

    const orders = blueprint.components.find(
      c => c.id.toString() === 'orders-topic',
    )!;
    expect(orders.services!.map(s => s.type.toString()).sort()).toEqual([
      'Messaging.PaaS.Entity',
    ]);
    expect(
      orders
        .services!.flatMap(s => s.offers)
        .map(o => o.type.toString())
        .sort(),
    ).toEqual(['Messaging.PaaS.PubSubTopic', 'Messaging.PaaS.ServiceBusTopic']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorMessagingFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-messaging',
        environment,
        provider: 'AWS',
      }),
    ).toThrow(/No Broker offer/);
  });
});
