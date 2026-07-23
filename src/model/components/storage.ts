/**
 * components/storage.ts — Storage domain Component factories (Level 1).
 *
 * Abstract, vendor-agnostic capability contracts:
 *   - Storage.ObjectStorage
 *   - Storage.RelationalDbms
 *   - Storage.RelationalDatabase
 *
 * Each agnostic parameter is a typed `.withXxx()` guardrail setter (locks the
 * key at design time). Built exclusively on the LOCKED engine in ../core.
 */
import {
  ComponentNode,
  NodeState,
  AnyNode,
  newNode,
  guardrail,
  addDependency,
} from '../core';

// ── Storage.ObjectStorage ────────────────────────────────────────────────────
export type ObjectStorageNode<Id extends string = string> = ComponentNode<
  Id,
  'Storage.ObjectStorage'
> & {
  withVersioningEnabled: (v: boolean) => ObjectStorageNode<Id>;
  withStorageClass: (v: string) => ObjectStorageNode<Id>;
  withPublicAccess: (v: boolean) => ObjectStorageNode<Id>;
  withEncryption: (v: 'at-rest' | 'none') => ObjectStorageNode<Id>;
  withRetentionDays: (v: number) => ObjectStorageNode<Id>;
  withTags: (v: Record<string, string>) => ObjectStorageNode<Id>;
};
const objectStorageNode = <Id extends string>(
  s: NodeState,
): ObjectStorageNode<Id> => ({
  state: s,
  withVersioningEnabled: v =>
    objectStorageNode<Id>(guardrail(s, 'versioningEnabled', v)),
  withStorageClass: v => objectStorageNode<Id>(guardrail(s, 'storageClass', v)),
  withPublicAccess: v => objectStorageNode<Id>(guardrail(s, 'publicAccess', v)),
  withEncryption: v => objectStorageNode<Id>(guardrail(s, 'encryption', v)),
  withRetentionDays: v =>
    objectStorageNode<Id>(guardrail(s, 'retentionDays', v)),
  withTags: v => objectStorageNode<Id>(guardrail(s, 'tags', v)),
});
export const ObjectStorage = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): ObjectStorageNode<Id> =>
  objectStorageNode<Id>(
    newNode(cfg.id, 'Storage.ObjectStorage', cfg.displayName),
  );

/**
 * Settings shape for a link from a compute consumer (a VM, a workload, ...) to a
 * `Storage.ObjectStorage`. The link declares "I use this bucket"; the agent
 * ensures the consumer has an identity, grants that identity a bucket role
 * SCOPED by `access` (least-privilege — no broad `cloud-platform`), and
 * publishes the bucket URI to the consumer so it resolves it at runtime.
 *
 * The bucket URI is NOT carried on the link — it is published by the storage
 * component as an output field and delivered to the consumer at reconciliation
 * time, mirroring the relational-database and identity-provider links. Use with
 * the generic `bp.link` / operation `link`:
 *
 *   link(vm, bucket, {access: 'read-write'} satisfies ObjectStorageLink);
 */
export type ObjectStorageLink = {
  access: 'read' | 'write' | 'read-write';
};

// ── Storage.RelationalDbms ───────────────────────────────────────────────────
export type RelationalDbmsNode<Id extends string = string> = ComponentNode<
  Id,
  'Storage.RelationalDbms'
> & {
  withEngineVersion: (v: string) => RelationalDbmsNode<Id>;
  withSizeTier: (v: string) => RelationalDbmsNode<Id>;
  withStorageGb: (v: number) => RelationalDbmsNode<Id>;
  withBackupRetentionDays: (v: number) => RelationalDbmsNode<Id>;
  withHighAvailability: (v: string) => RelationalDbmsNode<Id>;
};
const relationalDbmsNode = <Id extends string>(
  s: NodeState,
): RelationalDbmsNode<Id> => ({
  state: s,
  withEngineVersion: v =>
    relationalDbmsNode<Id>(guardrail(s, 'engineVersion', v)),
  withSizeTier: v => relationalDbmsNode<Id>(guardrail(s, 'sizeTier', v)),
  withStorageGb: v => relationalDbmsNode<Id>(guardrail(s, 'storageGb', v)),
  withBackupRetentionDays: v =>
    relationalDbmsNode<Id>(guardrail(s, 'backupRetentionDays', v)),
  withHighAvailability: v =>
    relationalDbmsNode<Id>(guardrail(s, 'highAvailability', v)),
});
export const RelationalDbms = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): RelationalDbmsNode<Id> =>
  relationalDbmsNode<Id>(
    newNode(cfg.id, 'Storage.RelationalDbms', cfg.displayName),
  );

// ── Storage.RelationalDatabase ───────────────────────────────────────────────
export type RelationalDatabaseNode<Id extends string = string> = ComponentNode<
  Id,
  'Storage.RelationalDatabase'
> & {
  withCharset: (v: string) => RelationalDatabaseNode<Id>;
  withCollation: (v: string) => RelationalDatabaseNode<Id>;
  dependsOn: (other: AnyNode) => RelationalDatabaseNode<Id>;
};
const relationalDatabaseNode = <Id extends string>(
  s: NodeState,
): RelationalDatabaseNode<Id> => ({
  state: s,
  withCharset: v => relationalDatabaseNode<Id>(guardrail(s, 'charset', v)),
  withCollation: v => relationalDatabaseNode<Id>(guardrail(s, 'collation', v)),
  dependsOn: other =>
    relationalDatabaseNode<Id>(addDependency(s, other.state.id)),
});
export const RelationalDatabase = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): RelationalDatabaseNode<Id> =>
  relationalDatabaseNode<Id>(
    newNode(cfg.id, 'Storage.RelationalDatabase', cfg.displayName),
  );

/**
 * Settings shape for a link from a consumer (a workload, a function, ...) to a
 * `Storage.RelationalDatabase`. The link declares "I use this database"; the
 * agent grants the consumer a database role scoped by `access` and injects
 * vendor-neutral connection env (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`,
 * `DB_PASSWORD_REF`) into the consumer at reconciliation time.
 *
 * Connection facts are NOT carried on the link — they are published by the
 * database as output fields and injected downstream, mirroring the identity
 * provider client link. The raw password is never placed in output fields:
 * `DB_PASSWORD_REF` carries only a secret-store reference the runtime resolves
 * at launch. Use with the generic `bp.link` / operation `link`:
 *
 *   link(workload, db, {access: 'read-write'} satisfies RelationalDatabaseLink);
 */
export type RelationalDatabaseLink = {
  access: 'read-write' | 'read-only';
};
