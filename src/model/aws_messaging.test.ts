/**
 * aws_messaging.test.ts — executable spec for the AWS SNS topic and SQS queue
 * offers and the Workload → MessagingEntity link.
 *
 *   - `AwsSnsTopic` / `AwsSqsQueue` satisfy `Messaging.MessagingEntity` and emit
 *     the agent's parameter keys;
 *   - a queue subscribes to at most one topic, declared as a dependency
 *     (`withTopic`), which may be a reference to another Live System's topic;
 *   - `filterEventNames` travels comma-separated, `filterPolicy` as JSON text;
 *   - what cannot deploy is refused while building the Live System.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {MessagingEntity} from './components/messaging';
import type {MessagingEntityLink} from './components/messaging_entity_link';
import {Workload} from './components/custom_workloads';
import {AwsSnsTopic, AwsSqsQueue} from './offers/messaging';
import {K8sWorkload} from './offers/custom_workloads';
import {referenceTo} from './reference';

const OWNER = '00000000-0000-0000-0000-0000000000bb';
const environment = {ownerType: 'Organizational', ownerId: OWNER, name: 'prod'};
const boundedContextId = {
  ownerType: 'Organizational',
  ownerId: OWNER,
  name: 'accounts',
};
const PROVIDER_LS = `Organizational/${OWNER}/organizations/organizations`;

const pubSub = () =>
  createFractal({
    id: 'pub-sub',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const events = bp.add(MessagingEntity({id: 'events'}));
      const upstream = bp.add(MessagingEntity({id: 'upstream'}));
      const inbox = bp.add(MessagingEntity({id: 'inbox'}).withTopic(upstream));
      const service = bp.add(Workload({id: 'service'}));
      bp.link(service, events, {
        access: 'publish',
      } satisfies MessagingEntityLink);
      bp.link(service, inbox, {
        access: 'subscribe',
      } satisfies MessagingEntityLink);
      return {events, upstream, inbox, service};
    },
  });

const build = (
  queue = AwsSqsQueue({
    filterEventNames: ['OrganizationCreated', 'MemberAdded'],
  }),
) =>
  pubSub().toLiveSystem({
    name: 'accounts',
    environment,
    select: {
      events: AwsSnsTopic({}),
      upstream: referenceTo(AwsSnsTopic, {
        liveSystemId: PROVIDER_LS,
        componentId: 'events',
      }),
      inbox: queue,
      service: K8sWorkload({namespace: 'fractal'}),
    },
  });

describe('AwsSnsTopic', () => {
  it('emits the SNS topic offer with its configuration', () => {
    const ls = pubSub().toLiveSystem({
      name: 'accounts',
      environment,
      select: {
        events: AwsSnsTopic({
          topicName: 'accounts-events',
          kmsMasterKeyId: 'alias/aws/sns',
        }),
        upstream: AwsSnsTopic({}),
        inbox: AwsSqsQueue({}),
        service: K8sWorkload({}),
      },
    });
    const events = ls.components.find(c => c.id === 'events')!;
    expect(events).toMatchObject({
      type: 'Messaging.PaaS.AwsSnsTopic',
      provider: 'AWS',
      deliveryModel: 'PaaS',
      parameters: {
        topicName: 'accounts-events',
        kmsMasterKeyId: 'alias/aws/sns',
      },
    });
  });
});

describe('AwsSqsQueue', () => {
  it('subscribes to the topic it depends on, which may be a reference', () => {
    const ls = build();
    const inbox = ls.components.find(c => c.id === 'inbox')!;
    const upstream = ls.components.find(c => c.id === 'upstream')!;
    expect(inbox.type).toBe('Messaging.PaaS.AwsSqsQueue');
    expect(inbox.provider).toBe('AWS');
    expect(inbox.dependencies).toEqual(['upstream']);
    expect(upstream.reference).toEqual({
      liveSystemId: PROVIDER_LS,
      componentId: 'events',
    });
  });

  it('sends filterEventNames comma-separated', () => {
    const inbox = build().components.find(c => c.id === 'inbox')!;
    expect(inbox.parameters.filterEventNames).toBe(
      'OrganizationCreated,MemberAdded',
    );
  });

  it('sends filterPolicy as JSON text', () => {
    const policy = {eventName: ['A'], refeedTarget: [{exists: true}]};
    const inbox = build(AwsSqsQueue({filterPolicy: policy})).components.find(
      c => c.id === 'inbox',
    )!;
    expect(inbox.parameters.filterPolicy).toBe(JSON.stringify(policy));
    expect(inbox.parameters.filterEventNames).toBeUndefined();
  });

  it('passes the queue knobs under the agent keys', () => {
    const inbox = build(
      AwsSqsQueue({
        queueName: 'accounts-inbox',
        visibilityTimeoutSeconds: 120,
        messageRetentionSeconds: 86400,
        maxReceiveCount: 3,
        dlqRetentionSeconds: 604800,
        rawMessageDelivery: false,
      }),
    ).components.find(c => c.id === 'inbox')!;
    expect(inbox.parameters).toMatchObject({
      queueName: 'accounts-inbox',
      visibilityTimeoutSeconds: 120,
      messageRetentionSeconds: 86400,
      maxReceiveCount: 3,
      dlqRetentionSeconds: 604800,
      rawMessageDelivery: false,
    });
  });

  it('accepts dlqAlarm false, which is what the agent does, and does not send it', () => {
    const inbox = build(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      AwsSqsQueue({dlqAlarm: false} as any),
    ).components.find(c => c.id === 'inbox')!;
    expect(inbox.parameters).not.toHaveProperty('dlqAlarm');
  });

  it('refuses dlqAlarm true: the agent creates no alarm', () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      build(AwsSqsQueue({dlqAlarm: true} as any)),
    ).toThrow(
      "AwsSqsQueue 'inbox': dlqAlarm cannot be honored, the agent creates no CloudWatch alarm. " +
        'Fix: remove dlqAlarm, and alert on the dead-letter queue depth in Prometheus / Grafana.',
    );
  });

  it('refuses filterEventNames together with filterPolicy', () => {
    expect(() =>
      build(AwsSqsQueue({filterEventNames: ['A'], filterPolicy: {x: ['y']}})),
    ).toThrow(
      "AwsSqsQueue 'inbox': set either filterEventNames or filterPolicy, not both.",
    );
  });

  it.each([[''], ['  '], ['A,B']])(
    'refuses the filter event name %j, which the comma-separated list cannot carry',
    name => {
      expect(() =>
        build(AwsSqsQueue({filterEventNames: ['Ok', name]})),
      ).toThrow(
        `AwsSqsQueue 'inbox': filterEventNames holds '${name}', which is blank or holds a comma.`,
      );
    },
  );

  const queueOf = (topics: number) =>
    createFractal({
      id: 'subs',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const a = bp.add(MessagingEntity({id: 'a'}));
        const b = bp.add(MessagingEntity({id: 'b'}));
        const base = MessagingEntity({id: 'q'});
        const q = bp.add(
          topics === 0
            ? base
            : topics === 1
              ? base.withTopic(a)
              : base.withTopic(a).withTopic(b),
        );
        return {a, b, q};
      },
    });

  it('refuses a filter on a queue that subscribes to no topic', () => {
    expect(() =>
      queueOf(0).toLiveSystem({
        name: 'subs',
        environment,
        select: {
          a: AwsSnsTopic({}),
          b: AwsSnsTopic({}),
          q: AwsSqsQueue({filterEventNames: ['A']}),
        },
      }),
    ).toThrow(
      "AwsSqsQueue 'q': a filter filters a subscription, but 'q' subscribes to no topic. Subscribe it with withTopic(topic).",
    );
  });

  it('refuses a queue subscribed to two topics', () => {
    expect(() =>
      queueOf(2).toLiveSystem({
        name: 'subs',
        environment,
        select: {a: AwsSnsTopic({}), b: AwsSnsTopic({}), q: AwsSqsQueue({})},
      }),
    ).toThrow(
      "AwsSqsQueue 'q' subscribes to at most one AwsSnsTopic, but depends on [a, b]. Give each subscription its own queue.",
    );
  });

  it('refuses a queue subscribed to something that is not an SNS topic', () => {
    expect(() =>
      queueOf(1).toLiveSystem({
        name: 'subs',
        environment,
        select: {a: AwsSqsQueue({}), b: AwsSnsTopic({}), q: AwsSqsQueue({})},
      }),
    ).toThrow(
      "AwsSqsQueue 'q' can subscribe only to an AwsSnsTopic, but 'a' is a Messaging.PaaS.AwsSqsQueue.",
    );
  });

  it('maps the neutral retention and delivery-attempt guardrails onto the queue', () => {
    const inbox = createFractal({
      id: 'neutral-queue',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({
        inbox: bp.add(
          MessagingEntity({id: 'inbox'})
            .withMessageRetentionHours(48)
            .withMaxDeliveryAttempts(7),
        ),
      }),
    })
      .toLiveSystem({name: 'x', environment, select: {inbox: AwsSqsQueue({})}})
      .components.find(c => c.id === 'inbox')!;
    expect(inbox.parameters.messageRetentionSeconds).toBe(172800);
    expect(inbox.parameters.maxReceiveCount).toBe(7);
  });

  it('refuses a vendor knob contradicting a locked neutral guardrail', () => {
    expect(() =>
      createFractal({
        id: 'neutral-queue',
        version: {major: 1, minor: 0, patch: 0},
        boundedContextId,
        blueprint: bp => ({
          inbox: bp.add(
            MessagingEntity({id: 'inbox'}).withMaxDeliveryAttempts(7),
          ),
        }),
      }).toLiveSystem({
        name: 'x',
        environment,
        select: {inbox: AwsSqsQueue({maxReceiveCount: 3})},
      }),
    ).toThrow(
      /maxReceiveCount: 3.*contradicts the locked guardrail 'maxDeliveryAttempts: 7'/,
    );
  });
});

describe('Workload → MessagingEntity link', () => {
  it('serializes access on the workload, pointing at the local ids', () => {
    const service = build().components.find(c => c.id === 'service')!;
    expect(service.links).toEqual([
      {componentId: 'events', settings: {access: 'publish'}},
      {componentId: 'inbox', settings: {access: 'subscribe'}},
    ]);
  });
});

describe('AwsSnsTopic maximumMessageSize', () => {
  const topic = (maximumMessageSize: number) =>
    pubSub().toLiveSystem({
      name: 'accounts',
      environment,
      select: {
        events: AwsSnsTopic({maximumMessageSize}),
        upstream: AwsSnsTopic({}),
        inbox: AwsSqsQueue({}),
        service: K8sWorkload({}),
      },
    });

  it('carries the 1 MiB opt-in', () => {
    const events = topic(1048576).components.find(c => c.id === 'events')!;
    expect(events.parameters.maximumMessageSize).toBe(1048576);
  });
});

describe('AwsSqsQueue review follow-ups', () => {
  const neutralQueue = (
    author: (
      e: ReturnType<typeof MessagingEntity>,
    ) => ReturnType<typeof MessagingEntity>,
    queue = AwsSqsQueue({}),
  ) =>
    createFractal({
      id: 'neutral-queue',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({
        inbox: bp.add(author(MessagingEntity({id: 'inbox'}))),
      }),
    })
      .toLiveSystem({name: 'x', environment, select: {inbox: queue}})
      .components.find(c => c.id === 'inbox')!;

  it('keeps a mapped guardrail when the same knob is passed as undefined', () => {
    const inbox = neutralQueue(
      e => e.withMaxDeliveryAttempts(7),
      AwsSqsQueue({maxReceiveCount: undefined}),
    );
    expect(inbox.parameters.maxReceiveCount).toBe(7);
  });

  // A value is checked against the agent's contract, which types these keys
  // (it declares no ranges yet: the agent refuses a value outside them).
  it('refuses a value the contract types otherwise', () => {
    expect(() =>
      neutralQueue(e => e, AwsSqsQueue({maxReceiveCount: 2.5})),
    ).toThrow("Live component 'inbox': 2.5 is not the integer 'maxReceiveCount' takes.");
  });

  it('accepts the range bounds', () => {
    expect(() =>
      neutralQueue(
        e => e,
        AwsSqsQueue({
          visibilityTimeoutSeconds: 0,
          messageRetentionSeconds: 1209600,
          dlqRetentionSeconds: 60,
          maxReceiveCount: 1000,
        }),
      ),
    ).not.toThrow();
  });

  it('refuses deadLetterEnabled false: the queue always has a dead-letter queue', () => {
    expect(() => neutralQueue(e => e.withDeadLetterEnabled(false))).toThrow(
      /deadLetterEnabled/,
    );
  });
});
