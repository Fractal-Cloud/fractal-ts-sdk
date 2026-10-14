/**
 * components/messaging.ts — Messaging domain Component factories (Level 1).
 *
 * Abstract, vendor-agnostic Components for the locked Fractal model. Agnostic
 * `.withXxx()` setters are GUARDRAILS (locked at design time) via guardrail().
 * Offers that satisfy these Components live in offers/messaging.ts.
 */
import {
  ComponentNode,
  NodeState,
  AnyNode,
  newNode,
  guardrail,
  addDependency,
} from '../core';
import type {DnsZoneAccessRequest} from './dns_zone_access_request';
import {withDnsZonesParameter} from './dns_zones_parameter';

// ── Broker ───────────────────────────────────────────────────────────────────
export type BrokerNode<Id extends string = string> = ComponentNode<
  Id,
  'Messaging.Broker'
> & {
  withTier: (v: string) => BrokerNode<Id>;
  withEncryption: (v: 'at-rest' | 'none') => BrokerNode<Id>;
  /**
   * Declare a structural dependency: e.g. the ContainerPlatform a self-hosted
   * offer is installed on, which its agent requires.
   */
  dependsOn: (other: AnyNode) => BrokerNode<Id>;
};
const brokerNode = <Id extends string>(s: NodeState): BrokerNode<Id> => ({
  state: s,
  withTier: v => brokerNode<Id>(guardrail(s, 'tier', v)),
  withEncryption: v => brokerNode<Id>(guardrail(s, 'encryption', v)),
  dependsOn: other => brokerNode<Id>(addDependency(s, other.state.id)),
});
export const Broker = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): BrokerNode<Id> =>
  brokerNode<Id>(newNode(cfg.id, 'Messaging.Broker', cfg.displayName));

// ── MessagingEntity (depends on a Broker) ─────────────────────────────────────
export type MessagingEntityNode<Id extends string = string> = ComponentNode<
  Id,
  'Messaging.MessagingEntity'
> & {
  withMessageRetentionHours: (v: number) => MessagingEntityNode<Id>;
  withPartitionCount: (v: number) => MessagingEntityNode<Id>;
  withDeadLetterEnabled: (v: boolean) => MessagingEntityNode<Id>;
  withMaxDeliveryAttempts: (v: number) => MessagingEntityNode<Id>;
  /**
   * Subscribe this entity (a queue) to `topic`: a dependency, so the queue is
   * created after the topic and its subscription is made by the queue's side.
   * The topic may be filled with a reference to another Live System's topic.
   */
  withTopic: (topic: MessagingEntityNode) => MessagingEntityNode<Id>;
  dependsOn: (other: AnyNode) => MessagingEntityNode<Id>;
};
const messagingEntityNode = <Id extends string>(
  s: NodeState,
): MessagingEntityNode<Id> => ({
  state: s,
  withMessageRetentionHours: v =>
    messagingEntityNode<Id>(guardrail(s, 'messageRetentionHours', v)),
  withPartitionCount: v =>
    messagingEntityNode<Id>(guardrail(s, 'partitionCount', v)),
  withDeadLetterEnabled: v =>
    messagingEntityNode<Id>(guardrail(s, 'deadLetterEnabled', v)),
  withMaxDeliveryAttempts: v =>
    messagingEntityNode<Id>(guardrail(s, 'maxDeliveryAttempts', v)),
  withTopic: topic => messagingEntityNode<Id>(addDependency(s, topic.state.id)),
  dependsOn: other => messagingEntityNode<Id>(addDependency(s, other.state.id)),
});
export const MessagingEntity = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): MessagingEntityNode<Id> =>
  messagingEntityNode<Id>(
    newNode(cfg.id, 'Messaging.MessagingEntity', cfg.displayName),
  );

// ── EmailSender ──────────────────────────────────────────────────────────────
/**
 * Sends transactional email from a verified domain. Abstract: the domain and
 * its DNS records are the offer's (e.g. `AwsSesIdentity`).
 */
export type EmailSenderNode<Id extends string = string> = ComponentNode<
  Id,
  'Messaging.EmailSender'
> & {
  /**
   * Ask for access to environment DNS zones, e.g. CNAME, MX and TXT write on
   * the sending domain's zone, so the sender can write its own verification
   * records. The control plane grants the sender's identity that access, cut
   * down to each zone's `componentAccess` ceiling. An open default, not a
   * guardrail: the zones depend on the environment, so an operation may change
   * them.
   *
   * `AwsSesIdentity` refuses it until its agent writes the records through
   * the grant; it publishes them as output fields instead.
   */
  withDnsZones: (zones: readonly DnsZoneAccessRequest[]) => EmailSenderNode<Id>;
};
const emailSenderNode = <Id extends string>(
  s: NodeState,
): EmailSenderNode<Id> => ({
  state: s,
  withDnsZones: zones => emailSenderNode<Id>(withDnsZonesParameter(s, zones)),
});
export const EmailSender = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): EmailSenderNode<Id> =>
  emailSenderNode<Id>(
    newNode(cfg.id, 'Messaging.EmailSender', cfg.displayName),
  );
