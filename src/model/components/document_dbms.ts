/**
 * components/document_dbms.ts — Storage.DocumentDbms (Level 1).
 *
 * A managed document database speaking the MongoDB wire protocol (the
 * catalog's `Storage.PaaS.DocumentDbms`, e.g. FerretDB). Consumers link to it
 * with `DocumentDbmsLink`; its managed-service settings are guardrails.
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

export type DocumentDbmsNode<Id extends string = string> = ComponentNode<
  Id,
  'Storage.DocumentDbms'
> &
  ManagedServiceSetters<DocumentDbmsNode<Id>> & {
    /**
     * Declare a structural dependency: e.g. the ContainerPlatform a managed
     * offer runs on, which its agent requires.
     */
    dependsOn: (other: AnyNode) => DocumentDbmsNode<Id>;
  };
const documentDbmsNode = <Id extends string>(
  s: NodeState,
): DocumentDbmsNode<Id> => ({
  state: s,
  ...managedServiceSetters(s, documentDbmsNode<Id>),
  dependsOn: other => documentDbmsNode<Id>(addDependency(s, other.state.id)),
});
export const DocumentDbms = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): DocumentDbmsNode<Id> =>
  documentDbmsNode<Id>(
    newNode(cfg.id, 'Storage.DocumentDbms', cfg.displayName),
  );
