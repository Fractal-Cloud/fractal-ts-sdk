/**
 * basic_messaging.test.ts
 *
 * Integration tests for the basic_messaging sample pattern.
 * Verifies the blueprint builds correctly and each provider's live system
 * maps components with the right types, dependencies, and parameters.
 */

import {describe, expect, it} from 'vitest';
import {Broker} from '../fractal/component/messaging/paas/broker';
import {MessagingEntity} from '../fractal/component/messaging/paas/entity';
import {AzureServiceBus} from '../live_system/component/messaging/paas/azure_service_bus';
import {AzureServiceBusTopic} from '../live_system/component/messaging/paas/azure_service_bus_topic';
import {GcpPubSub} from '../live_system/component/messaging/paas/gcp_pubsub';
import {GcpPubSubTopic} from '../live_system/component/messaging/paas/gcp_pubsub_topic';

// ── Blueprint fixtures ──────────────────────────────────────────────────────

const ordersTopic = MessagingEntity.create({
  id: 'orders-topic',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'Orders Topic',
});

const notificationsTopic = MessagingEntity.create({
  id: 'notifications-topic',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'Notifications Topic',
});

const broker = Broker.create({
  id: 'event-broker',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'Event Broker',
}).withEntities([ordersTopic, notificationsTopic]);

// ── Blueprint tests ─────────────────────────────────────────────────────────

describe('basic_messaging blueprint', () => {
  it('should create Broker with correct type', () => {
    expect(broker.broker.type.toString()).toBe('Messaging.PaaS.Broker');
    expect(broker.broker.id.toString()).toBe('event-broker');
    expect(broker.broker.displayName).toBe('Event Broker');
  });

  it('should create entities with correct type', () => {
    expect(broker.entities).toHaveLength(2);
    expect(broker.entities[0].component.type.toString()).toBe(
      'Messaging.PaaS.Entity',
    );
    expect(broker.entities[1].component.type.toString()).toBe(
      'Messaging.PaaS.Entity',
    );
  });

  it('should auto-wire broker dependency into each entity', () => {
    for (const entity of broker.entities) {
      const depIds = entity.component.dependencies.map(d => d.id.toString());
      expect(depIds).toContain('event-broker');
    }
  });

  it('should preserve entity IDs and display names', () => {
    expect(broker.entities[0].component.id.toString()).toBe('orders-topic');
    expect(broker.entities[0].component.displayName).toBe('Orders Topic');
    expect(broker.entities[1].component.id.toString()).toBe(
      'notifications-topic',
    );
    expect(broker.entities[1].component.displayName).toBe(
      'Notifications Topic',
    );
  });
});

// ── Azure live system tests ─────────────────────────────────────────────────

describe('basic_messaging Azure live system', () => {
  it('should satisfy Broker with AzureServiceBus', () => {
    const azureBroker = AzureServiceBus.satisfy(broker.broker)
      .withAzureRegion('westeurope')
      .withAzureResourceGroup('my-rg')
      .withSku('Standard')
      .build();

    expect(azureBroker.type.toString()).toBe('Messaging.PaaS.ServiceBus');
    expect(azureBroker.provider).toBe('Azure');
    expect(azureBroker.id.toString()).toBe('event-broker');
    expect(azureBroker.displayName).toBe('Event Broker');
    expect(azureBroker.parameters.getOptionalFieldByName('azureRegion')).toBe(
      'westeurope',
    );
    expect(
      azureBroker.parameters.getOptionalFieldByName('azureResourceGroup'),
    ).toBe('my-rg');
    expect(azureBroker.parameters.getOptionalFieldByName('sku')).toBe(
      'Standard',
    );
  });

  it('should satisfy MessagingEntity with AzureServiceBusTopic and carry broker dependency', () => {
    const ordersEntity = broker.entities[0];
    const azureTopic = AzureServiceBusTopic.satisfy(ordersEntity.component)
      .withAzureRegion('westeurope')
      .withAzureResourceGroup('my-rg')
      .build();

    expect(azureTopic.type.toString()).toBe('Messaging.PaaS.ServiceBusTopic');
    expect(azureTopic.provider).toBe('Azure');
    expect(azureTopic.id.toString()).toBe('orders-topic');
    expect(azureTopic.displayName).toBe('Orders Topic');

    // broker dependency carried from blueprint
    const depIds = azureTopic.dependencies.map(d => d.id.toString());
    expect(depIds).toContain('event-broker');

    // vendor-specific params
    expect(azureTopic.parameters.getOptionalFieldByName('azureRegion')).toBe(
      'westeurope',
    );
    expect(
      azureTopic.parameters.getOptionalFieldByName('azureResourceGroup'),
    ).toBe('my-rg');
  });

  it('should carry dependencies for all entities', () => {
    const notificationsEntity = broker.entities[1];
    const azureTopic = AzureServiceBusTopic.satisfy(
      notificationsEntity.component,
    )
      .withAzureRegion('westeurope')
      .withAzureResourceGroup('my-rg')
      .build();

    expect(azureTopic.id.toString()).toBe('notifications-topic');
    const depIds = azureTopic.dependencies.map(d => d.id.toString());
    expect(depIds).toContain('event-broker');
  });
});

// ── GCP live system tests ───────────────────────────────────────────────────

describe('basic_messaging GCP live system', () => {
  it('should satisfy Broker with GcpPubSub', () => {
    const gcpBroker = GcpPubSub.satisfy(broker.broker).build();

    expect(gcpBroker.type.toString()).toBe('Messaging.PaaS.PubSub');
    expect(gcpBroker.provider).toBe('GCP');
    expect(gcpBroker.id.toString()).toBe('event-broker');
    expect(gcpBroker.displayName).toBe('Event Broker');
  });

  it('should satisfy MessagingEntity with GcpPubSubTopic and carry broker dependency', () => {
    const ordersEntity = broker.entities[0];
    const gcpTopic = GcpPubSubTopic.satisfy(ordersEntity.component).build();

    expect(gcpTopic.type.toString()).toBe('Messaging.PaaS.PubSubTopic');
    expect(gcpTopic.provider).toBe('GCP');
    expect(gcpTopic.id.toString()).toBe('orders-topic');
    expect(gcpTopic.displayName).toBe('Orders Topic');

    // broker dependency carried from blueprint
    const depIds = gcpTopic.dependencies.map(d => d.id.toString());
    expect(depIds).toContain('event-broker');
  });

  it('should carry dependencies for all entities', () => {
    const notificationsEntity = broker.entities[1];
    const gcpTopic = GcpPubSubTopic.satisfy(
      notificationsEntity.component,
    ).build();

    expect(gcpTopic.id.toString()).toBe('notifications-topic');
    const depIds = gcpTopic.dependencies.map(d => d.id.toString());
    expect(depIds).toContain('event-broker');
  });
});
