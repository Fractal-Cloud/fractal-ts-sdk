/**
 * components/unmanaged.ts — generic Unmanaged (SaaS / external) Component
 * (Level 1, abstract).
 *
 * Models a third-party / external service Fractal does not provision (e.g. the
 * OpenAI API). It holds config + a secret; a consumer link injects the config
 * and a secret-REFERENCE (never the raw secret) into the consumer at
 * reconciliation time. One abstract component, satisfied by per-domain SaaS
 * offers in offers/unmanaged.ts (AI.SaaS.Unmanaged, Storage.SaaS.Unmanaged, ...).
 *
 * Built exclusively on the LOCKED engine in ../core.
 */
import {ComponentNode, NodeState, newNode, guardrail} from '../core';

// ── Unmanaged ────────────────────────────────────────────────────────────────
export type UnmanagedNode<Id extends string = string> = ComponentNode<
  Id,
  'Unmanaged'
> & {
  withTags: (v: Record<string, string>) => UnmanagedNode<Id>;
};
const unmanagedNode = <Id extends string>(s: NodeState): UnmanagedNode<Id> => ({
  state: s,
  withTags: v => unmanagedNode<Id>(guardrail(s, 'tags', v)),
});
export const Unmanaged = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): UnmanagedNode<Id> =>
  unmanagedNode<Id>(newNode(cfg.id, 'Unmanaged', cfg.displayName));

/**
 * Settings shape for a link from a consumer (a VM, a workload, ...) to an
 * `Unmanaged` component. The presence of the link declares "I consume this
 * external service"; the agent injects the component's config plus a
 * `<PREFIX>_SECRET_REF` into the consumer at reconciliation time.
 *
 * The secret is NOT carried on the link — the raw value stays in the
 * environment secret store and only a reference is injected, mirroring the
 * identity-provider client link. `envPrefix` names the env under which the
 * config/ref are injected; when omitted the agent defaults to the target id.
 *
 *   link(vm, openai, {envPrefix: 'OPENAI'} satisfies UnmanagedLink);
 */
export type UnmanagedLink = {
  envPrefix?: string;
};
