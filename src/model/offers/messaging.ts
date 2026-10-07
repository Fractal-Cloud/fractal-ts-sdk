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

// ── AWS: SNS topic + SQS queue (satisfy 'Messaging.MessagingEntity') ─────────
const AWS_SNS_TOPIC_TYPE = 'Messaging.PaaS.AwsSnsTopic';
const AWS_SQS_QUEUE_TYPE = 'Messaging.PaaS.AwsSqsQueue';

/** SNS topic names: 1–256 letters, digits, hyphens and underscores (standard topics). */
const SNS_TOPIC_NAME = /^[A-Za-z0-9_-]{1,256}$/;
/** SQS queue names: 1–80 of the same characters; the DLQ appends `-dlq`, so 76 here. */
const SQS_QUEUE_NAME = /^[A-Za-z0-9_-]{1,76}$/;

/**
 * A standard Amazon SNS topic: the events a Domain Service publishes. Other
 * Live Systems subscribe to it with an `AwsSqsQueue` that depends on a
 * reference to it (`referenceTo(AwsSnsTopic, {...})`).
 *
 * Output fields: `topicArn`, `topicName`.
 */
export const AwsSnsTopic = defineOffer<
  'Messaging.MessagingEntity',
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
>({
  satisfies: 'Messaging.MessagingEntity',
  offerType: AWS_SNS_TOPIC_TYPE,
  provider: 'AWS',
  deliveryModel: 'PaaS',
  validate: (self, _all, config) => {
    const size = config.maximumMessageSize;
    if (
      size !== undefined &&
      (!Number.isInteger(size) || size < 1024 || size > 1048576)
    ) {
      throw new Error(
        `AwsSnsTopic '${self.id}': maximumMessageSize ${size} is not a whole number of bytes from 1024 to 1048576.`,
      );
    }
    if (
      config.topicName !== undefined &&
      !SNS_TOPIC_NAME.test(config.topicName)
    ) {
      throw new Error(
        `AwsSnsTopic '${self.id}': topicName '${config.topicName}' is not an SNS ` +
          'topic name (1-256 letters, digits, hyphens and underscores).',
      );
    }
  },
});

// ── AWS: SES identity (satisfies 'Messaging.EmailSender') ────────────────────
/** A domain name as the AWS agent accepts it (lower case, at least two labels). */
const SES_DOMAIN =
  /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;
/** One DNS label. */
const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * A DNS name as the AWS agent reads it: trimmed, lower case, without a trailing
 * dot; blank is unset (undefined).
 */
const normalizedDnsName = (value: string | undefined): string | undefined => {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed;
};

/**
 * The production access request as the AWS agent sends it: with
 * `productionAccess`, `websiteUrl` (http(s)) and `useCaseDescription` are
 * required; `mailType` and `contactLanguage` are read case-insensitively.
 * Without it the agent reads none of them, so none is checked.
 */
const validateSesProductionAccess = (
  id: string,
  config: {
    productionAccess?: boolean;
    mailType?: string;
    websiteUrl?: string;
    useCaseDescription?: string;
    contactLanguage?: string;
  },
): void => {
  if (config.productionAccess !== true) {
    return;
  }
  for (const key of ['websiteUrl', 'useCaseDescription'] as const) {
    const value = config[key];
    if (value === undefined || value.trim() === '') {
      throw new Error(
        `AwsSesIdentity '${id}': productionAccess needs ${key}; without it the agent sends no request.`,
      );
    }
  }
  if (!/^https?:\/\/\S+$/.test(config.websiteUrl!.trim())) {
    throw new Error(
      `AwsSesIdentity '${id}': websiteUrl '${config.websiteUrl}' is not an http(s) URL.`,
    );
  }
  const mailType = config.mailType?.trim().toUpperCase();
  if (
    mailType !== undefined &&
    mailType !== '' &&
    !['TRANSACTIONAL', 'MARKETING'].includes(mailType)
  ) {
    throw new Error(
      `AwsSesIdentity '${id}': mailType '${config.mailType}' is not TRANSACTIONAL or MARKETING.`,
    );
  }
  const language = config.contactLanguage?.trim().toUpperCase();
  if (
    language !== undefined &&
    language !== '' &&
    !['EN', 'JA'].includes(language)
  ) {
    throw new Error(
      `AwsSesIdentity '${id}': contactLanguage '${config.contactLanguage}' is not EN or JA.`,
    );
  }
};

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
>({
  satisfies: 'Messaging.EmailSender',
  offerType: 'Messaging.PaaS.AwsSesIdentity',
  provider: 'AWS',
  deliveryModel: 'PaaS',
  validate: (self, _all, config) => {
    const domain = normalizedDnsName(config.domain);
    if (domain === undefined || !SES_DOMAIN.test(domain)) {
      throw new Error(
        `AwsSesIdentity '${self.id}': domain '${config.domain}' is not a domain name.`,
      );
    }
    validateSesProductionAccess(self.id, config);
    const sub = normalizedDnsName(config.mailFromSubdomain);
    if (sub === undefined) {
      return;
    }
    if (!DNS_LABEL.test(sub)) {
      throw new Error(
        `AwsSesIdentity '${self.id}': mailFromSubdomain '${config.mailFromSubdomain}' must be one DNS label ` +
          "(letters, digits, '-').",
      );
    }
    if (sub.length + 1 + domain.length > 253) {
      throw new Error(
        `AwsSesIdentity '${self.id}': '${sub}.${domain}' is longer than a domain name may be.`,
      );
    }
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

type SqsQueueConfig = {
  /** Defaults to the component id. The dead-letter queue is `<queueName>-dlq`. */
  queueName?: string;
  /** Default 60. */
  visibilityTimeoutSeconds?: number;
  /** Default 345600 (4 days). */
  messageRetentionSeconds?: number;
  /** Receives before a message moves to the dead-letter queue; default 5. */
  maxReceiveCount?: number;
  /** Default 1209600 (14 days). */
  dlqRetentionSeconds?: number;
  /** Deliver the published message as is, without the SNS envelope; default true. */
  rawMessageDelivery?: boolean;
  /**
   * Deliver only messages whose `eventName` attribute is one of these. Empty or
   * absent: every message of the topic.
   */
  filterEventNames?: readonly string[];
  /** A raw SNS filter policy, in place of `filterEventNames`. */
  filterPolicy?: Record<string, unknown> | string;
};

const INTEGER_BOUNDS: ReadonlyArray<[keyof SqsQueueConfig, number, number]> = [
  ['visibilityTimeoutSeconds', 0, 43200],
  ['messageRetentionSeconds', 60, 1209600],
  ['maxReceiveCount', 1, 1000],
  ['dlqRetentionSeconds', 60, 1209600],
];

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
  offerType: AWS_SQS_QUEUE_TYPE,
  provider: 'AWS',
  deliveryModel: 'PaaS',
  instantiate: (ctx, config) => {
    // dlqAlarm false is what the agent does anyway (it creates no alarm), so it
    // is dropped rather than sent; any other value is refused in validate.
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
  validate: (self, all, config) => {
    if (
      config.queueName !== undefined &&
      !SQS_QUEUE_NAME.test(config.queueName)
    ) {
      throw new Error(
        `AwsSqsQueue '${self.id}': queueName '${config.queueName}' is not an SQS ` +
          "queue name (1-76 letters, digits, hyphens and underscores, leaving room for '-dlq').",
      );
    }
    if (
      self.parameters['dlqAlarm'] !== undefined &&
      self.parameters['dlqAlarm'] !== false
    ) {
      throw new Error(
        `AwsSqsQueue '${self.id}': dlqAlarm was removed, the agent creates no CloudWatch alarm. ` +
          'Alert on the dead-letter queue depth in Prometheus / Grafana instead.',
      );
    }
    if (self.parameters['deadLetterEnabled'] === false) {
      throw new Error(
        `AwsSqsQueue '${self.id}': deadLetterEnabled false cannot be honored, every ` +
          'AwsSqsQueue has a dead-letter queue.',
      );
    }
    // Checked on what is emitted, so values mapped from neutral guardrails count too.
    for (const [key, min, max] of INTEGER_BOUNDS) {
      const value = self.parameters[key];
      if (
        value !== undefined &&
        (!Number.isInteger(value) ||
          (value as number) < min ||
          (value as number) > max)
      ) {
        throw new Error(
          `AwsSqsQueue '${self.id}': ${key} ${String(value)} is not a whole number from ${min} to ${max}.`,
        );
      }
    }
    const messagingDependencies = all.filter(
      c => self.dependencies.includes(c.id) && c.type.startsWith('Messaging.'),
    );
    const foreign = messagingDependencies.find(
      c => c.type !== AWS_SNS_TOPIC_TYPE,
    );
    if (foreign) {
      throw new Error(
        `AwsSqsQueue '${self.id}' can subscribe only to an AwsSnsTopic, but '${foreign.id}' ` +
          `is a ${foreign.type}.`,
      );
    }
    if (messagingDependencies.length > 1) {
      throw new Error(
        `AwsSqsQueue '${self.id}' subscribes to at most one AwsSnsTopic, but depends on ` +
          `[${messagingDependencies.map(c => c.id).join(', ')}]. Give each subscription its own queue.`,
      );
    }
    const names = config.filterEventNames ?? [];
    if (names.length > 0 && config.filterPolicy !== undefined) {
      throw new Error(
        `AwsSqsQueue '${self.id}': set either filterEventNames or filterPolicy, not both.`,
      );
    }
    const badName = names.find(n => n.trim() === '' || n.includes(','));
    if (badName !== undefined) {
      throw new Error(
        `AwsSqsQueue '${self.id}': filterEventNames holds '${badName}', which is blank or holds a comma.`,
      );
    }
    if (
      (names.length > 0 || config.filterPolicy !== undefined) &&
      messagingDependencies.length === 0
    ) {
      throw new Error(
        `AwsSqsQueue '${self.id}': a filter filters a subscription, but '${self.id}' subscribes ` +
          'to no topic. Subscribe it with withTopic(topic).',
      );
    }
  },
});
