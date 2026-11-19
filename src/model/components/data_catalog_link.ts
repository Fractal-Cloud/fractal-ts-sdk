/**
 * Settings shape for a link from a consumer (a workload, a data processing job,
 * ...) to a `BigData.DataCatalog`, in the catalog's (aria-spec)
 * `BigData.PaaS.DataCatalog` link vocabulary. The catalog's agent grants the
 * consumer `accessMode` on `resource`. Use with the generic `bp.link`:
 *
 *   bp.link(job, catalog, {accessMode: 'read', resource: 'pilot.sales'} satisfies DataCatalogLink);
 *
 * An offer whose agent grants per resource grants nothing to a link without
 * `resource`, so it refuses one.
 */
export type DataCatalogLink = {
  /** What the consumer may do: read (query), write (insert, modify), or both. Required. */
  accessMode: 'read' | 'write' | 'readWrite';
  /** A catalog, `catalog.schema` or `catalog.schema.table`. */
  resource?: string;
};
