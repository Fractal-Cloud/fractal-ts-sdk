/**
 * Settings shape for a link from a consumer (a Kubernetes workload, Jaeger, ...)
 * to a `Storage.Search` component: "I use this search cluster". The link work is
 * done by the search component's agent (it is the target): it creates one
 * internal user for the consumer, with one role scoped to the index pattern
 * `<indexPrefix>*` and the rights `access` names (never `all_access`), and writes
 * that user's password and the cluster CA into a Kubernetes Secret in the
 * consumer's namespace (keys `password` and `ca.crt`).
 *
 * Connection facts are NOT carried on the link: the search component publishes
 * them per consumer (`linkedCredentials.<consumer>.url`, `username`,
 * `passwordSecretRef`, `indexPrefix`, ...), and a Kubernetes workload receives
 * them as `SEARCH_URL`, `SEARCH_USERNAME`, `SEARCH_PASSWORD_REF`,
 * `SEARCH_INDEX_PREFIX` and `SEARCH_CA_REF`. The raw password is never in an
 * output field. Build the settings with `searchLinkSettings`:
 *
 *   bp.link(service, search, searchLinkSettings({access: 'read-write'}));
 *
 * The target may be a reference to another Live System's search component.
 */
export type SearchLink = {
  /** What the consumer may do on its indices. Required, no default. */
  access: 'read' | 'write' | 'read-write';
  /**
   * Prefix of the indices the consumer may use; its role covers `<indexPrefix>*`.
   * Lower-case letters, digits and `-_.` only. Defaults to `<consumerId>-`.
   */
  indexPrefix?: string;
};
