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
import {AwsSnsTopic, AwsSqsQueue, GcpPubSubTopic} from './offers/messaging';
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

  it.each([['has.dot'], ['x'.repeat(257)], ['']])(
    "refuses topicName '%s', which SNS does not accept",
    topicName => {
      expect(() =>
        pubSub().toLiveSystem({
          name: 'accounts',
          environment,
          select: {
            events: AwsSnsTopic({topicName}),
            upstream: AwsSnsTopic({}),
            inbox: AwsSqsQueue({}),
            service: K8sWorkload({}),
          },
        }),
      ).toThrow(/topicName/);
    },
  );
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
        dlqAlarm: false,
      }),
    ).components.find(c => c.id === 'inbox')!;
    expect(inbox.parameters).toMatchObject({
      queueName: 'accounts-inbox',
      visibilityTimeoutSeconds: 120,
      messageRetentionSeconds: 86400,
      maxReceiveCount: 3,
      dlqRetentionSeconds: 604800,
      rawMessageDelivery: false,
      dlqAlarm: false,
    });
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

  it('refuses a queue that depends on two topics', () => {
    const f = createFractal({
      id: 'two-topics',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const a = bp.add(MessagingEntity({id: 'a'}));
        const b = bp.add(MessagingEntity({id: 'b'}));
        const q = bp.add(MessagingEntity({id: 'q'}).withTopic(a).withTopic(b));
        return {a, b, q};
      },
    });
    expect(() =>
      f.toLiveSystem({
        name: 'x',
        environment,
        select: {a: AwsSnsTopic({}), b: AwsSnsTopic({}), q: AwsSqsQueue({})},
      }),
    ).toThrow(
      /'q' subscribes to at most one AwsSnsTopic, but depends on \[a, b\]/,
    );
  });

  it('refuses a queue that depends on a topic of another vendor', () => {
    const f = createFractal({
      id: 'other-vendor',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const a = bp.add(MessagingEntity({id: 'a'}));
        const q = bp.add(MessagingEntity({id: 'q'}).withTopic(a));
        return {a, q};
      },
    });
    expect(() =>
      f.toLiveSystem({
        name: 'x',
        environment,
        select: {a: GcpPubSubTopic({}), q: AwsSqsQueue({})},
      }),
    ).toThrow(
      /'q' can subscribe only to an AwsSnsTopic.*'a' is a Messaging.PaaS.GcpPubSubTopic/,
    );
  });

  it('refuses a filter on a queue that subscribes to no topic', () => {
    const f = createFractal({
      id: 'lonely',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({q: bp.add(MessagingEntity({id: 'q'}))}),
    });
    expect(() =>
      f.toLiveSystem({
        name: 'x',
        environment,
        select: {q: AwsSqsQueue({filterEventNames: ['A']})},
      }),
    ).toThrow(/filters a subscription, but 'q' subscribes to no topic/);
  });

  it('refuses filterEventNames together with filterPolicy', () => {
    expect(() =>
      build(
        AwsSqsQueue({
          filterEventNames: ['A'],
          filterPolicy: {eventName: ['B']},
        }),
      ),
    ).toThrow(/either filterEventNames or filterPolicy/);
  });

  it.each([[['']], [['A,B']], [[' ']]])(
    'refuses an event name that is blank or holds a comma: %j',
    names => {
      expect(() => build(AwsSqsQueue({filterEventNames: names}))).toThrow(
        /filterEventNames/,
      );
    },
  );

  it.each([['has.dot'], ['x'.repeat(77)], ['']])(
    "refuses queueName '%s' (SQS names, leaving room for '-dlq')",
    queueName => {
      expect(() => build(AwsSqsQueue({queueName}))).toThrow(/queueName/);
    },
  );
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

  it.each([[1023], [1048577], [2048.5]])('refuses %s bytes', size => {
    expect(() => topic(size)).toThrow(/maximumMessageSize/);
  });
});
