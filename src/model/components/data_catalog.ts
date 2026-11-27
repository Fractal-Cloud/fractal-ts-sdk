/**
 * components/data_catalog.ts — BigData.DataCatalog (Level 1).
 *
 * A data catalog governing tables over data in object storage (the catalog's
 * `BigData.PaaS.DataCatalog`, e.g. Unity Catalog). Its tables are
 * `DataCatalogTable` components that depend on it. Consumers link to it with
 * `DataCatalogLink` (naming a catalog, schema or table in `resource`), or to one
 * of its tables with `DataCatalogTableLink`.
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

export type DataCatalogNode<Id extends string = string> = ComponentNode<
  Id,
  'BigData.DataCatalog'
> &
  ManagedServiceSetters<DataCatalogNode<Id>> & {
    /**
     * Declare a structural dependency: e.g. the ContainerPlatform a managed
     * offer runs on, which its agent requires.
     */
    dependsOn: (other: AnyNode) => DataCatalogNode<Id>;
  };
const dataCatalogNode = <Id extends string>(
  s: NodeState,
): DataCatalogNode<Id> => ({
  state: s,
  ...managedServiceSetters(s, dataCatalogNode<Id>),
  dependsOn: other => dataCatalogNode<Id>(addDependency(s, other.state.id)),
});
export const DataCatalog = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
  /** `PaaS` (default, e.g. Unity Catalog) or `CaaS`: one catalog component per model. */
  deliveryModel?: 'PaaS' | 'CaaS';
}): DataCatalogNode<Id> =>
  dataCatalogNode<Id>(
    newNode(cfg.id, 'BigData.DataCatalog', cfg.displayName, cfg.deliveryModel),
  );
