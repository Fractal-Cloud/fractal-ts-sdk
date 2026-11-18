/**
 * A consumer → `Storage.Search` link in the link vocabulary the catalog
 * declares for `Storage.PaaS.Search` (aria-spec): `accessMode` and
 * `indexPattern`. It says the same as `SearchLink`, in the spelling the
 * managed search offers' agents read; the selected offer translates it for an
 * agent that reads another one. Build the settings with `searchLinkSettings`:
 *
 *   bp.link(service, search, searchLinkSettings({
 *     accessMode: 'readWrite',
 *     indexPattern: 'orders-*',
 *   }));
 */
export type CatalogSearchLink = {
  /** What the consumer may do on its indices. Required, no default. */
  accessMode: 'read' | 'write' | 'readWrite';
  /**
   * Pattern of the indices the consumer may use: lower-case letters, digits,
   * `-_.` and `*`. Defaults to the consumer's own indices (`<consumerId>-*`).
   * An offer whose agent grants an index prefix only takes `<prefix>*`.
   */
  indexPattern?: string;
};
