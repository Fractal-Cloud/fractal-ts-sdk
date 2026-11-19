/**
 * components/key_value_dbms.ts — Storage.KeyValueDbms (Level 1).
 *
 * A managed key-value store (the catalog's `Storage.PaaS.KeyValueDbms`, e.g.
 * Valkey). Consumers link to it with `KeyValueDbmsLink`; its size and layout
 * are the selected offer's, its managed-service settings are guardrails.
 */
import {
  ComponentNode,
  NodeState,
  AnyNode,
  newNode,
  addDependency,
} from '../core';
import {
  ManagedServiceSetters,
  managedServiceSetters,
} from './managed/managed_service_setters';

export type KeyValueDbmsNode<Id extends string = string> = ComponentNode<
  Id,
  'Storage.KeyValueDbms'
> &
  ManagedServiceSetters<KeyValueDbmsNode<Id>> & {
    /**
     * Declare a structural dependency: e.g. the ContainerPlatform a managed
     * offer runs on, which its agent requires.
     */
    dependsOn: (other: AnyNode) => KeyValueDbmsNode<Id>;
  };
const keyValueDbmsNode = <Id extends string>(
  s: NodeState,
): KeyValueDbmsNode<Id> => ({
  state: s,
  ...managedServiceSetters(s, keyValueDbmsNode<Id>),
  dependsOn: other => keyValueDbmsNode<Id>(addDependency(s, other.state.id)),
});
export const KeyValueDbms = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): KeyValueDbmsNode<Id> =>
  keyValueDbmsNode<Id>(
    newNode(cfg.id, 'Storage.KeyValueDbms', cfg.displayName),
  );
