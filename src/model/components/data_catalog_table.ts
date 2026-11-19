/**
 * components/data_catalog_table.ts — BigData.DataCatalogTable (Level 1).
 *
 * A table of a data catalog over data in object storage (the catalog's
 * `BigData.PaaS.DataCatalogTable`). It depends on its `DataCatalog`. Its
 * catalog, schema, columns, location and format are the selected offer's
 * config, as its agent publishes them; it has no neutral parameters. Consumers
 * link to it with `DataCatalogTableLink`.
 */
import {
  ComponentNode,
  NodeState,
  AnyNode,
  newNode,
  addDependency,
} from '../core';
import type {DataCatalogNode} from './data_catalog';

export type DataCatalogTableNode<Id extends string = string> = ComponentNode<
  Id,
  'BigData.DataCatalogTable'
> & {
  /** Declare a structural dependency, e.g. on the data's storage. */
  dependsOn: (other: AnyNode) => DataCatalogTableNode<Id>;
};
const dataCatalogTableNode = <Id extends string>(
  s: NodeState,
): DataCatalogTableNode<Id> => ({
  state: s,
  dependsOn: other =>
    dataCatalogTableNode<Id>(addDependency(s, other.state.id)),
});
/** A table of `catalog`: it depends on it. */
export const DataCatalogTable = <const Id extends string>(cfg: {
  id: Id;
  catalog: DataCatalogNode;
  displayName?: string;
}): DataCatalogTableNode<Id> =>
  dataCatalogTableNode<Id>(
    addDependency(
      newNode(cfg.id, 'BigData.DataCatalogTable', cfg.displayName),
      cfg.catalog.state.id,
    ),
  );
