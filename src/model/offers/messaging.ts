/**
 * offers/messaging.ts — Messaging domain Offers (Catalogue, Level 3).
 *
 * Concrete vendor-specific implementations that satisfy the abstract Messaging
 * Components in components/messaging.ts. Vendor knobs live in each offer's Cfg.
 * Vendor-neutral self-hosted offers (Kafka on any cluster) OMIT `provider`.
 */
import {defineOffer} from '../core';
import type {InstantiationContext} from '../core';

// ── Broker offers (satisfy 'Messaging.Broker') ───────────────────────────────
/** Service Bus namespace SKU. Basic namespaces support queues ONLY — they cannot
 *  host topics, and ARM rejects the topic create with 400 SubCode=40000.
 *
 *  ⚠ CHANGING THIS ON A DEPLOYED NAMESPACE DESTROYS IT. The Azure agent treats a
 *  requested tier that differs from the live namespace's tier as an unrecoverable
 *  state: `MessagingNamespaceStuckStateHelper.isStuck()` returns true on ANY tier
 *  mismatch, and `AzureServiceBus.identifyAndResolveDriftForAzureComponent()`
 *  responds with `armService.serviceBus.delete(...)`, deferring the create to the
 *  next reconcile pass. The namespace and every queue, topic, subscription and
 *  enqueued message in it are deleted — the agent has no in-place SKU update
 *  path. A namespace created before this offer defaulted the SKU sits at the
 *  agent's own default (Basic), so deploying it once this default applies is a
 *  destructive operation. Pass `skuTier: 'Basic'` explicitly to keep it. */
export type AzureServiceBusSkuTier = 'Basic' | 'Standard' | 'Premium';

const SKU_TIERS: readonly AzureServiceBusSkuTier[] = [
  'Basic',
  'Standard',
  'Premium',
];

/**
 * The SKU an EXACT ARM SKU spelling names, or undefined for anything else.
 *
 * Matching is deliberately exact — no trimming, no case folding. `withTier` takes
 * a free-form string on a vendor-agnostic Component, and `'premium'` / `'basic'`
 * are ordinary words for a service tier or an environment class, not statements
 * about an Azure SKU. Case-insensitive matching made `withTier('premium')`
 * provision a Service Bus **Premium** namespace — a base charge roughly two orders
 * of magnitude above Standard — and, because the agent responds to any tier change
 * by deleting the namespace, destroy the live one to get there. An architect who
 * means the SKU writes the SKU: `withTier('Premium')`.
 */
const exactSkuTier = (value: unknown): AzureServiceBusSkuTier | undefined =>
  typeof value === 'string' ? SKU_TIERS.find(t => t === value) : undefined;

/** Offer type of the only Azure `Messaging.MessagingEntity` in this catalogue. */
const AZURE_SERVICE_BUS_TOPIC_TYPE = 'Messaging.PaaS.AzureServiceBusTopic';

/**
 * Refuse a Basic namespace that a topic in the same Live System depends on. ARM
 * rejects a topic create against a Basic namespace with 400 SubCode=40000, and
 * `AzureServiceBusTopic` is the only Azure MessagingEntity here — so this
 * combination cannot deploy, and the SDK knows it before the request is sent.
 * `instantiate` cannot see sibling components, which is why this is a `validate`.
 */
const refuseBasicNamespaceWithTopics = (
  self: {id: string; parameters: Record<string, unknown>},
  all: readonly {type: string; id: string; dependencies: readonly string[]}[],
): void => {
  if (self.parameters['skuTier'] !== 'Basic') {
    return;
  }
  const topics = all
    .filter(
      c =>
        c.type === AZURE_SERVICE_BUS_TOPIC_TYPE &&
        c.dependencies.includes(self.id),
    )
    .map(c => c.id);
  if (topics.length > 0) {
    throw new Error(
      `Service Bus namespace '${self.id}' is on the Basic SKU, which cannot host ` +
        'topics (ARM rejects the create with 400 SubCode=40000), but ' +
        `[${topics.join(', ')}] depend on it. Use 'Standard' or 'Premium' for a ` +
        'namespace with topics; Basic is only valid for a namespace whose ' +
        'entities are created at runtime by the application.',
    );
  }
};

/**
 * Resolve the namespace SKU. Only two things may claim it:
 *
 *   1. a LOCKED neutral `tier` guardrail whose value is an EXACT SKU spelling —
 *      the architect's design-time decision, which core.ts documents as "locked;
 *      devs cannot override";
 *   2. the offer's own `skuTier` vendor knob;
 *
 * and otherwise `Standard`, the default.
 *
 * An explicit `skuTier` contradicting an exact locked SKU throws rather than
 * discarding one of the two intents silently — the defect this replaced, where the
 * offer appended `skuTier: 'Standard'` unconditionally, so a broker locked to
 * `'Basic'` shipped `tier: 'Basic'` and `skuTier: 'Standard'` at once.
 *
 * An UNLOCKED `tier` deliberately claims nothing. It is dev-open, so letting it
 * pick the SKU would hand a recurring charge and a destroy-and-recreate to an
 * ordinary `.set('tier', …)` call, which is not what a caller of a vendor-neutral
 * parameter is asking for.
 */
const resolveSkuTier = (
  ctx: InstantiationContext,
  cfg: {skuTier?: AzureServiceBusSkuTier},
): AzureServiceBusSkuTier => {
  const locked = (ctx.locked ?? []).includes('tier')
    ? exactSkuTier(ctx.parameters['tier'])
    : undefined;
  if (locked) {
    if (cfg.skuTier && cfg.skuTier !== locked) {
      throw new Error(
        `Offer config 'skuTier: ${cfg.skuTier}' contradicts the locked guardrail ` +
          `'tier: ${locked}' on '${ctx.id}'. The guardrail is locked at design ` +
          'time and decides the Service Bus namespace SKU; drop the skuTier ' +
          `override or set it to '${locked}'.`,
      );
    }
    return locked;
  }
  return cfg.skuTier ?? 'Standard';
};
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
  validate: refuseBasicNamespaceWithTopics,
  // Default to Standard rather than deferring to the agent, whose default is
  // Basic. `AzureServiceBusTopic` below is the only Azure MessagingEntity in this
  // catalogue — there is no queue offer — so a Basic namespace cannot host any
  // entity this SDK is able to create. Shipping a namespace default that its own
  // sibling offer cannot use is an internal inconsistency, not a user error.
  //
  // The default is NOT free: Standard carries a monthly base charge that Basic
  // does not, and applying it to an ALREADY-DEPLOYED Basic namespace deletes that
  // namespace (see the warning on `AzureServiceBusSkuTier` above). A queue-only
  // workload — namespace provisioned here, queues created at runtime by the
  // application — wants Basic and must now pass it explicitly.
  //
  // Only an exact SKU spelling in a LOCKED `tier` guardrail overrides this default
  // (see `resolveSkuTier`). A free-form label such as 'premium' does not: reading
  // it as the Premium SKU would move an unchanged caller onto a per-messaging-unit
  // charge and delete their namespace on the way.
  //
  // `skuTier` does reach the agent. Verified against the agent and control-plane
  // sources rather than assumed:
  //   - the agent DECLARES it: the Service Bus parameter class publishes an
  //     optional string `skuTier` in its parameter contract, and the namespace
  //     instantiator strategy returns that contract — so the contract-pruning
  //     machinery keeps the key. (That pruning is not even on this path: it
  //     applies to synthesized topologies, not to a LiveSystem the SDK posts.)
  //   - the agent READS it: the parameter constructor lifts a non-blank flat
  //     `skuTier` into the nested ARM-shaped `sku.tier`, taking precedence over
  //     the nested map.
  //   - the control plane does not STRIP it: the LiveSystem service merges
  //     blueprint parameters OVER the posted component's and drops nothing, so an
  //     SDK-only key survives unless the blueprint sets the SAME key to a
  //     non-empty value — and no blueprint component carries `skuTier`, which is
  //     a vendor knob on a vendor-agnostic blueprint.
  instantiate: (ctx, cfg) => [
    {
      id: ctx.id,
      displayName: ctx.displayName,
      type: 'Messaging.PaaS.AzureServiceBus',
      provider: 'Azure',
      deliveryModel: 'PaaS',
      // `skuTier` last so the resolved SKU always beats a spread-in value, and an
      // explicitly-passed `undefined` still falls back to the default.
      parameters: {
        ...ctx.parameters,
        ...cfg,
        skuTier: resolveSkuTier(ctx, cfg),
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
