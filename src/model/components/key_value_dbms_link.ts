/**
 * Settings shape for a link from a consumer (a workload, ...) to a
 * `Storage.KeyValueDbms`: "I use this key-value store". The store's agent (the
 * target) grants the consumer's workload identity `accessMode` on the keys of
 * `keyPattern`; connection facts are published by the store, never carried on
 * the link. Use with the generic `bp.link`:
 *
 *   bp.link(workload, cache, {accessMode: 'readWrite', keyPattern: 'session:*'} satisfies KeyValueDbmsLink);
 *
 * @experimental The settings follow the data-access link the catalog
 * (aria-spec) is adding to `Storage.PaaS.KeyValueDbms` (its DBMS link today
 * carries only the declarative `accessLevel`). The names may change until that
 * text is merged; the managed key-value agent reads these today.
 */
export type KeyValueDbmsLink = {
  /** What the consumer may do on its keys. Required, no default. */
  accessMode: 'read' | 'write' | 'readWrite';
  /** Glob of the keys the consumer may use (e.g. `session:*`). Defaults to every key. */
  keyPattern?: string;
};
