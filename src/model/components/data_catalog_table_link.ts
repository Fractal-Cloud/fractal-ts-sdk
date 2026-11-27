/**
 * Settings shape for a link from a consumer (a workload, a data processing job,
 * ...) to a `BigData.DataCatalogTable`, in the catalog's (aria-spec)
 * `BigData.PaaS.DataCatalogTable` link vocabulary. The table's catalog agent
 * grants the consumer `accessMode` on that table. Use with the generic `bp.link`:
 *
 *   bp.link(job, orders, {accessMode: 'readWrite'} satisfies DataCatalogTableLink);
 */
export type DataCatalogTableLink = {
  /** What the consumer may do: read (query), write (insert, modify), or both. Required. */
  accessMode: 'read' | 'write' | 'readWrite';
};
