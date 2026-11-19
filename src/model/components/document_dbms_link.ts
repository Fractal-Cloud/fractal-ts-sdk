/**
 * Settings shape for a link from a consumer (a workload, ...) to a
 * `Storage.DocumentDbms`: "I use this document database". The database's agent
 * (the target) grants the consumer's workload identity `accessMode` on its
 * databases; connection facts are published by the database, never carried on
 * the link. An offer whose agent grants nothing narrower than `readWrite`
 * refuses `read` and `write`. Use with the generic `bp.link`:
 *
 *   bp.link(workload, documents, {accessMode: 'readWrite'} satisfies DocumentDbmsLink);
 *
 * @experimental The settings follow the data-access link the catalog
 * (aria-spec) is adding to `Storage.PaaS.DocumentDbms` (its DBMS link today
 * carries only the declarative `accessLevel`). The names may change until that
 * text is merged; the managed document-database agent reads these today.
 */
export type DocumentDbmsLink = {
  /** What the consumer may do on the databases. Required, no default. */
  accessMode: 'read' | 'write' | 'readWrite';
};
