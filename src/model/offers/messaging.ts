/**
 * offers/messaging.ts — Messaging domain Offers (Catalogue, Level 3).
 *
 * Concrete vendor-specific implementations that satisfy the abstract Messaging
 * Components in components/messaging.ts. Vendor knobs live in each offer's Cfg.
 * Vendor-neutral self-hosted offers (Kafka on any cluster) OMIT `provider`.
 */
import {toContractKey, unsupported, unsupportedUnless} from './neutral_rules';
import {
  Messaging_CaaS_Kafka,
  Messaging_CaaS_KafkaTopic,
  Messaging_PaaS_AwsSesIdentity,
  Messaging_PaaS_AwsSnsTopic,
  Messaging_PaaS_AwsSqsQueue,
  Messaging_PaaS_AzureServiceBus,
  Messaging_PaaS_AzureServiceBusTopic,
  Messaging_PaaS_GcpPubSub,
  Messaging_PaaS_GcpPubSubTopic,
} from './generated/messaging';
import type {ContractConfig} from './contract/contract_config';
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
const AZURE_SERVICE_BUS_TOPIC_TYPE =
  Messaging_PaaS_AzureServiceBusTopic.offerType;

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
const withoutTier = (
  parameters: Readonly<Record<string, unknown>>,
): Record<string, unknown> =>
  Object.fromEntries(Object.entries(parameters).filter(([k]) => k !== 'tier'));

export const AzureServiceBus = defineOffer<
  'Messaging.Broker',
  ContractConfig<
    typeof Messaging_PaaS_AzureServiceBus,
    'encryption',
    {
      /** Namespace SKU; defaults to Standard. See {@link AzureServiceBusSkuTier}. */
      skuTier?: AzureServiceBusSkuTier;
    }
  >
>({
  satisfies: 'Messaging.Broker',
  contract: Messaging_PaaS_AzureServiceBus,
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
      type: Messaging_PaaS_AzureServiceBus.offerType,
      provider: 'Azure',
      deliveryModel: 'PaaS',
      // `skuTier` last so the resolved SKU always beats a spread-in value, and an
      // explicitly-passed `undefined` still falls back to the default.
      // The neutral `tier` is consumed here (see `resolveSkuTier`); the agent
      // reads only `skuTier`, so it is not sent.
      parameters: {
        ...withoutTier(ctx.parameters),
        ...cfg,
        skuTier: resolveSkuTier(ctx, cfg),
      },
      dependencies: ctx.dependencies,
      links: ctx.links,
    },
  ],
});
export const GcpPubSub = defineOffer<
  'Messaging.Broker',
  ContractConfig<typeof Messaging_PaaS_GcpPubSub>
>({
  satisfies: 'Messaging.Broker',
  contract: Messaging_PaaS_GcpPubSub,
  provider: 'GCP',
  deliveryModel: 'PaaS',
  neutral: {
    encryption: unsupportedUnless(
      v => v === 'at-rest',
      'Pub/Sub always encrypts at rest',
    ),
    tier: unsupported('Pub/Sub has no tiers'),
  },
});
/** Vendor-neutral self-hosted Kafka — no `provider`. */
export const Kafka = defineOffer<
  'Messaging.Broker',
  ContractConfig<typeof Messaging_CaaS_Kafka>
>({
  satisfies: 'Messaging.Broker',
  contract: Messaging_CaaS_Kafka,
  deliveryModel: 'CaaS',
  neutral: {
    encryption: unsupported('the agent configures no encryption'),
    tier: unsupported('the agent has no tiers'),
  },
});

// ── MessagingEntity offers (satisfy 'Messaging.MessagingEntity') ──────────────
export const AzureServiceBusTopic = defineOffer<
  'Messaging.MessagingEntity',
  ContractConfig<typeof Messaging_PaaS_AzureServiceBusTopic>
>({
  satisfies: 'Messaging.MessagingEntity',
  contract: Messaging_PaaS_AzureServiceBusTopic,
  provider: 'Azure',
  deliveryModel: 'PaaS',
  neutral: {
    deadLetterEnabled: unsupported('the agent has no dead-letter setting'),
    maxDeliveryAttempts: unsupported('the agent has no delivery-attempt limit'),
    messageRetentionHours: toContractKey(
      Messaging_PaaS_AzureServiceBusTopic,
      'defaultMessageTimeToLive',
      v => `PT${String(v)}H`,
    ),
    partitionCount: unsupported('the agent has no partition setting'),
  },
});
export const GcpPubSubTopic = defineOffer<
  'Messaging.MessagingEntity',
  ContractConfig<typeof Messaging_PaaS_GcpPubSubTopic>
>({
  satisfies: 'Messaging.MessagingEntity',
  contract: Messaging_PaaS_GcpPubSubTopic,
  provider: 'GCP',
  deliveryModel: 'PaaS',
  neutral: {
    deadLetterEnabled: unsupported('the agent has no dead-letter setting'),
    maxDeliveryAttempts: unsupported('the agent has no delivery-attempt limit'),
    messageRetentionHours: unsupported(
      'the agent has no message retention setting',
    ),
    partitionCount: unsupported('the agent has no partition setting'),
  },
});
/** Vendor-neutral self-hosted Kafka topic — no `provider`. */
export const KafkaTopic = defineOffer<
  'Messaging.MessagingEntity',
  ContractConfig<typeof Messaging_CaaS_KafkaTopic>
>({
  satisfies: 'Messaging.MessagingEntity',
  contract: Messaging_CaaS_KafkaTopic,
  deliveryModel: 'CaaS',
  neutral: {
    deadLetterEnabled: unsupportedUnless(
      v => v === false,
      'Kafka has no dead-letter queue',
    ),
    maxDeliveryAttempts: unsupported('Kafka has no delivery-attempt limit'),
    messageRetentionHours: toContractKey(
      Messaging_CaaS_KafkaTopic,
      'retentionMs',
      v => Number(v) * 3_600_000,
    ),
    partitionCount: toContractKey(Messaging_CaaS_KafkaTopic, 'partitions'),
  },
});
const AWS_SQS_QUEUE_TYPE = Messaging_PaaS_AwsSqsQueue.offerType;

/**
 * A standard Amazon SNS topic: the events a Domain Service publishes. Other
 * Live Systems subscribe to it with an `AwsSqsQueue` that depends on a
 * reference to it (`referenceTo(AwsSnsTopic, {...})`).
 *
 * Output fields: `topicArn`, `topicName`.
 */
export const AwsSnsTopic = defineOffer<
  'Messaging.MessagingEntity',
  ContractConfig<
    typeof Messaging_PaaS_AwsSnsTopic,
    never,
    {
      /** Defaults to the component id. */
      topicName?: string;
      /** Server-side encryption key; defaults to the AWS-managed `alias/aws/sns`. */
      kmsMasterKeyId?: string;
      /**
       * Largest message in bytes, 1024 to 1048576; the agent defaults to 262144.
       * Above 262144 SNS accepts only SQS, Firehose and Lambda subscribers (at
       * most 100). The queue's limit is 1 MiB, so the topic's is the end-to-end one.
       */
      maximumMessageSize?: number;
    }
  >
>({
  satisfies: 'Messaging.MessagingEntity',
  contract: Messaging_PaaS_AwsSnsTopic,
  provider: 'AWS',
  deliveryModel: 'PaaS',
  neutral: {
    deadLetterEnabled: unsupported('the agent has no dead-letter setting'),
    maxDeliveryAttempts: unsupported('the agent has no delivery-attempt limit'),
    messageRetentionHours: unsupported(
      'the agent has no message retention setting',
    ),
    partitionCount: unsupported('the agent has no partition setting'),
  },
});

/**
 * An Amazon SES v2 domain identity with Easy DKIM (2048-bit), optionally with a
 * custom MAIL FROM domain `<mailFromSubdomain>.<domain>`.
 *
 * The agent writes no DNS: it publishes the records to create and stays
 * `Instantiating` until SES has verified them.
 *
 * `productionAccess: true` has the agent ask AWS, once, to move the account out
 * of the SES sandbox, with `websiteUrl` and `useCaseDescription` (both required
 * then), `mailType` and `contactLanguage`. Production access is account-wide and
 * per region, and cannot be reverted: `false` again only warns.
 *
 * Output fields: `identityArn`, `dkimRecords` (three CNAMEs), `verificationStatus`,
 * with a MAIL FROM subdomain `mailFromRecords` (MX and SPF) and `mailFromStatus`,
 * and once production access was asked for `productionAccessStatus` (`Sandbox`,
 * `Pending`, `Granted`, `Denied`, `Failed`).
 */
export const AwsSesIdentity = defineOffer<
  'Messaging.EmailSender',
  ContractConfig<
    typeof Messaging_PaaS_AwsSesIdentity,
    never,
    {
      /** The domain mail is sent from, e.g. `example.com`. */
      domain: string;
      /** One DNS label; MAIL FROM becomes `<label>.<domain>`. Unset or blank = SES's own. */
      mailFromSubdomain?: string;
      /**
       * `true`: request SES production access once. Account-wide and per region;
       * cannot be reverted. Unset or `false` = the sandbox.
       */
      productionAccess?: boolean;
      /** For the production access request. The agent's default: `TRANSACTIONAL`. */
      mailType?: 'TRANSACTIONAL' | 'MARKETING';
      /** Required with `productionAccess`: the sender's http(s) website. */
      websiteUrl?: string;
      /** Required with `productionAccess`: what is sent, to whom, and how bounces and complaints are handled. */
      useCaseDescription?: string;
      /** The language AWS answers the request in. The agent's default: `EN`. */
      contactLanguage?: 'EN' | 'JA';
    }
  >
>({
  satisfies: 'Messaging.EmailSender',
  contract: Messaging_PaaS_AwsSesIdentity,
  provider: 'AWS',
  deliveryModel: 'PaaS',
  neutral: {
    dnsZones: unsupported(
      'its agent does not write the SES records through a DNS zone grant yet; ' +
        'it publishes them as output fields for the zone to declare',
    ),
  },
});

/** The SQS knob a neutral `MessagingEntity` guardrail maps onto, and how. */
const NEUTRAL_QUEUE_KNOBS = [
  {
    neutral: 'messageRetentionHours',
    vendor: 'messageRetentionSeconds',
    convert: (hours: number) => hours * 3600,
  },
  {
    neutral: 'maxDeliveryAttempts',
    vendor: 'maxReceiveCount',
    convert: (attempts: number) => attempts,
  },
] as const;

/**
 * Map the neutral guardrails onto the queue's knobs. A knob set on the offer
 * wins over an unlocked neutral value, but contradicting a LOCKED one is
 * refused: the architect fixed it at design time.
 */
const queueParameters = (
  ctx: InstantiationContext,
  config: Record<string, unknown>,
): Record<string, unknown> => {
  const params: Record<string, unknown> = {...ctx.parameters};
  for (const {neutral, vendor, convert} of NEUTRAL_QUEUE_KNOBS) {
    const value = params[neutral];
    delete params[neutral];
    if (typeof value !== 'number') {
      continue;
    }
    const mapped = convert(value);
    const explicit = config[vendor];
    if (explicit !== undefined) {
      if ((ctx.locked ?? []).includes(neutral) && explicit !== mapped) {
        throw new Error(
          `Offer config '${vendor}: ${String(explicit)}' contradicts the locked ` +
            `guardrail '${neutral}: ${value}' on '${ctx.id}'. Drop the override or ` +
            `set it to ${mapped}.`,
        );
      }
      continue;
    }
    params[vendor] = mapped;
  }
  return params;
};

type SqsQueueConfig = ContractConfig<
  typeof Messaging_PaaS_AwsSqsQueue,
  never,
  {
    /** Defaults to the component id. The dead-letter queue is `<queueName>-dlq`. */
    queueName?: string;
    /**
     * Deliver only messages whose `eventName` attribute is one of these. Empty or
     * absent: every message of the topic.
     */
    filterEventNames?: readonly string[];
    /** A raw SNS filter policy, in place of `filterEventNames`. */
    filterPolicy?: Record<string, unknown> | string;
  }
>;

/**
 * A standard Amazon SQS queue with a dead-letter queue (`<queueName>-dlq`,
 * SSE-SQS on both). When it depends on an `AwsSnsTopic` — declared with
 * `withTopic`, and possibly a reference to another Live System's topic — the
 * queue's side creates the subscription and a queue policy that admits only
 * that topic.
 *
 * No CloudWatch alarm or log group is created: dead-letter depth is alerted on
 * by the self-hosted Prometheus / Grafana.
 *
 * Output fields: `queueUrl`, `queueArn`, `dlqUrl`, `dlqArn`, `subscriptionArn`.
 */
export const AwsSqsQueue = defineOffer<
  'Messaging.MessagingEntity',
  SqsQueueConfig
>({
  satisfies: 'Messaging.MessagingEntity',
  contract: Messaging_PaaS_AwsSqsQueue,
  provider: 'AWS',
  deliveryModel: 'PaaS',
  neutral: {
    deadLetterEnabled: unsupportedUnless(
      v => v === true,
      'the queue always has a dead-letter queue',
    ),
    partitionCount: unsupported('SQS has no partitions'),
  },
  instantiate: (ctx, config) => {
    // dlqAlarm is no key of the agent's contract (it creates no alarm). false is
    // what the agent does anyway, so it is dropped rather than sent.
    const {filterEventNames, filterPolicy, ...rest} = config;
    const given = {...rest} as Record<string, unknown>;
    if (given['dlqAlarm'] === false) {
      delete given['dlqAlarm'];
    }
    // An explicitly undefined knob must not erase a value mapped from a guardrail.
    const knobs = Object.fromEntries(
      Object.entries(given).filter(([, v]) => v !== undefined),
    );
    const filters: Record<string, unknown> = {};
    if (filterEventNames !== undefined && filterEventNames.length > 0) {
      filters.filterEventNames = filterEventNames.join(',');
    }
    if (filterPolicy !== undefined) {
      filters.filterPolicy =
        typeof filterPolicy === 'string'
          ? filterPolicy
          : JSON.stringify(filterPolicy);
    }
    return [
      {
        id: ctx.id,
        displayName: ctx.displayName,
        type: AWS_SQS_QUEUE_TYPE,
        provider: 'AWS',
        deliveryModel: 'PaaS',
        parameters: {...queueParameters(ctx, knobs), ...knobs, ...filters},
        dependencies: ctx.dependencies,
        links: ctx.links,
      },
    ];
  },
});
