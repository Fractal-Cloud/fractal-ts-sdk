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

// ── Broker ───────────────────────────────────────────────────────────────────
export type BrokerNode<Id extends string = string> = ComponentNode<
  Id,
  'Messaging.Broker'
> & {
  withTier: (v: string) => BrokerNode<Id>;
  withRegion: (v: string) => BrokerNode<Id>;
  withEncryption: (v: 'at-rest' | 'none') => BrokerNode<Id>;
};
const brokerNode = <Id extends string>(s: NodeState): BrokerNode<Id> => ({
  state: s,
  withTier: v => brokerNode<Id>(guardrail(s, 'tier', v)),
  withRegion: v => brokerNode<Id>(guardrail(s, 'region', v)),
  withEncryption: v => brokerNode<Id>(guardrail(s, 'encryption', v)),
});
export const Broker = <const Id extends string>(cfg: {
  id: Id;
}): BrokerNode<Id> => brokerNode<Id>(newNode(cfg.id, 'Messaging.Broker'));

// ── MessagingEntity (depends on a Broker) ─────────────────────────────────────
export type MessagingEntityNode<Id extends string = string> = ComponentNode<
  Id,
  'Messaging.MessagingEntity'
> & {
  withMessageRetentionHours: (v: number) => MessagingEntityNode<Id>;
  withPartitionCount: (v: number) => MessagingEntityNode<Id>;
  withDeadLetterEnabled: (v: boolean) => MessagingEntityNode<Id>;
  withMaxDeliveryAttempts: (v: number) => MessagingEntityNode<Id>;
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
  dependsOn: other => messagingEntityNode<Id>(addDependency(s, other.state.id)),
});
export const MessagingEntity = <const Id extends string>(cfg: {
  id: Id;
}): MessagingEntityNode<Id> =>
  messagingEntityNode<Id>(newNode(cfg.id, 'Messaging.MessagingEntity'));
