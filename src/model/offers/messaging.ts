/**
 * offers/messaging.ts — Messaging domain Offers (Catalogue, Level 3).
 *
 * Concrete vendor-specific implementations that satisfy the abstract Messaging
 * Components in components/messaging.ts. Vendor knobs live in each offer's Cfg.
 * Vendor-neutral self-hosted offers (Kafka on any cluster) OMIT `provider`.
 */
import {defineOffer} from '../core';

// ── Broker offers (satisfy 'Messaging.Broker') ───────────────────────────────
export const AzureServiceBus = defineOffer<
  'Messaging.Broker',
  {resourceGroup: string}
>({
  satisfies: 'Messaging.Broker',
  offerType: 'Messaging.PaaS.AzureServiceBus',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcpPubSub = defineOffer<'Messaging.Broker', Record<string, never>>(
  {
    satisfies: 'Messaging.Broker',
    offerType: 'Messaging.PaaS.GcpPubSub',
    provider: 'GCP',
    deliveryModel: 'PaaS',
  },
);
/** Vendor-neutral self-hosted Kafka — no `provider`. */
export const Kafka = defineOffer<'Messaging.Broker', {namespace?: string}>({
  satisfies: 'Messaging.Broker',
  offerType: 'Messaging.CaaS.Kafka',
  deliveryModel: 'CaaS',
});

// ── MessagingEntity offers (satisfy 'Messaging.MessagingEntity') ──────────────
export const AzureServiceBusTopic = defineOffer<
  'Messaging.MessagingEntity',
  Record<string, never>
>({
  satisfies: 'Messaging.MessagingEntity',
  offerType: 'Messaging.PaaS.AzureServiceBusTopic',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcpPubSubTopic = defineOffer<
  'Messaging.MessagingEntity',
  Record<string, never>
>({
  satisfies: 'Messaging.MessagingEntity',
  offerType: 'Messaging.PaaS.GcpPubSubTopic',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
/** Vendor-neutral self-hosted Kafka topic — no `provider`. */
export const KafkaTopic = defineOffer<
  'Messaging.MessagingEntity',
  Record<string, never>
>({
  satisfies: 'Messaging.MessagingEntity',
  offerType: 'Messaging.CaaS.KafkaTopic',
  deliveryModel: 'CaaS',
});
