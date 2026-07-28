/**
 * offers/messaging.ts — Messaging domain Offers (Catalogue, Level 3).
 *
 * Concrete vendor-specific implementations that satisfy the abstract Messaging
 * Components in components/messaging.ts. Vendor knobs live in each offer's Cfg.
 * Vendor-neutral self-hosted offers (Kafka on any cluster) OMIT `provider`.
 */
import {defineOffer} from '../core';

// ── Broker offers (satisfy 'Messaging.Broker') ───────────────────────────────
/** Service Bus namespace SKU. Basic namespaces support queues ONLY — they cannot
 *  host topics, and ARM rejects the topic create with 400 SubCode=40000. */
export type AzureServiceBusSkuTier = 'Basic' | 'Standard' | 'Premium';
export const AzureServiceBus = defineOffer<
  'Messaging.Broker',
  {
    region?: string;
    resourceGroup: string;
    /** Namespace SKU; defaults to Standard. See {@link AzureServiceBusSkuTier}. */
    skuTier?: AzureServiceBusSkuTier;
  }
>({
  satisfies: 'Messaging.Broker',
  offerType: 'Messaging.PaaS.AzureServiceBus',
  provider: 'Azure',
  deliveryModel: 'PaaS',
  // Default to Standard rather than deferring to the agent, whose default is
  // Basic. `AzureServiceBusTopic` below is the only Azure MessagingEntity in this
  // catalogue — there is no queue offer — so a Basic namespace cannot host any
  // entity this SDK is able to create. Shipping a namespace default that its own
  // sibling offer cannot use is an internal inconsistency, not a user error.
  // `skuTier` is the flat alias the agent accepts alongside the nested ARM-shaped
  // `sku` map, and it is published in the agent's parameter contract for this
  // offer type, so it survives contract pruning.
  instantiate: (ctx, cfg) => [
    {
      id: ctx.id,
      displayName: ctx.displayName,
      type: 'Messaging.PaaS.AzureServiceBus',
      provider: 'Azure',
      deliveryModel: 'PaaS',
      // `skuTier` last so an explicit vendor knob always beats the default, and
      // an explicitly-passed `undefined` still falls back to Standard.
      parameters: {
        ...ctx.parameters,
        ...cfg,
        skuTier: cfg.skuTier ?? 'Standard',
      },
      dependencies: ctx.dependencies,
      links: ctx.links,
    },
  ],
});
export const GcpPubSub = defineOffer<'Messaging.Broker', {region?: string}>({
  satisfies: 'Messaging.Broker',
  offerType: 'Messaging.PaaS.GcpPubSub',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
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
