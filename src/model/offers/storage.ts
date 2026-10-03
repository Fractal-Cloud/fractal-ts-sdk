/**
 * offers/storage.ts — Storage domain Offers (Catalogue, Level 3).
 *
 * Concrete, vendor-specific implementations declaring which abstract Storage
 * Component each satisfies. Vendor knobs live in each offer's config only.
 * Vendor-neutral self-hosted offers (e.g. MinIO on any cluster) omit `provider`.
 */
import {defineOffer} from '../core';
import type {
  InstantiationContext,
  LiveSystemComponent,
  Provider,
} from '../core';
import type {AwsRdsStorageType} from './aws_rds_storage_type';

/**
 * A DBMS offer emits itself PLUS one Database live component per child the
 * application added via `withDatabases` — each database lives in the DBMS's
 * vendor family, so it is not independently offer-selected. Swap the DBMS offer
 * and the databases' offer type follows.
 */
const dbmsInstantiate =
  (dbmsType: string, provider: Provider, databaseType: string) =>
  (ctx: InstantiationContext, config: unknown): LiveSystemComponent[] => [
    {
      id: ctx.id,
      displayName: ctx.displayName,
      type: dbmsType,
      provider,
      deliveryModel: 'PaaS',
      parameters: {...ctx.parameters, ...(config as Record<string, unknown>)},
      dependencies: [...ctx.dependencies],
      links: [...ctx.links],
    },
    ...ctx.children.map(child => ({
      id: child.id,
      displayName: child.displayName,
      type: databaseType,
      provider,
      deliveryModel: 'PaaS' as const,
      parameters: {...child.parameters},
      dependencies: [...child.dependencies],
      links: [...child.links],
    })),
  ];

const AWS_RDS_STORAGE_TYPES: readonly AwsRdsStorageType[] = [
  'gp2',
  'gp3',
  'io1',
  'io2',
  'standard',
];

// ── Storage.ObjectStorage offers ─────────────────────────────────────────────
export const AwsS3 = defineOffer<
  'Storage.ObjectStorage',
  {
    region?: string;
    /**
     * Expire every object this many days after it was written (and abort
     * incomplete multipart uploads after a day). Absent: objects never expire.
     */
    lifecycleExpirationDays?: number;
  }
>({
  satisfies: 'Storage.ObjectStorage',
  offerType: 'Storage.PaaS.AwsS3',
  provider: 'AWS',
  deliveryModel: 'PaaS',
  validate: (self, _all, config) => {
    const days = config.lifecycleExpirationDays;
    if (days !== undefined && (!Number.isInteger(days) || days < 1)) {
      throw new Error(
        `AwsS3 '${self.id}': lifecycleExpirationDays ${days} is not a whole number of at least 1.`,
      );
    }
  },
});
/**
 * Azure Storage account (blob). `sku` (a SkuName, e.g. `Standard_LRS`,
 * `Premium_LRS`) and `accessTier` (`Hot` / `Cool` / `Cold` / `Premium`) are named
 * for the parameters the Azure cloud agent actually reads, per its published
 * parameter contract.
 *
 * `region` is emitted for consistency with the other object-storage offers, but
 * the agent's storage-account offer resolves its location from the legacy
 * `azureRegion` key, so `region` does not currently move the account.
 *
 * This used to declare a required `accountTier`, a key no agent reads: the
 * agent's storage-account contract declares `sku` and `accessTier` and no
 * `accountTier`, so the value was accepted by the API, stored on the component
 * and silently ignored. It went unnoticed because every sample passed
 * `'Standard_LRS'`, which is what `sku` defaults to anyway — the account came
 * out right for the wrong reason, and any other value would have been dropped
 * without a word.
 */
export const AzureBlob = defineOffer<
  'Storage.ObjectStorage',
  {region?: string; sku?: string; accessTier?: string}
>({
  satisfies: 'Storage.ObjectStorage',
  offerType: 'Storage.PaaS.AzureBlob',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcsBucket = defineOffer<
  'Storage.ObjectStorage',
  {region?: string}
>({
  satisfies: 'Storage.ObjectStorage',
  offerType: 'Storage.PaaS.GcpGcsBucket',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
// Vendor-neutral self-hosted — runs on any cluster, so no `provider`.
// Exported symbol stays `MinIO`; the wire value is the catalogue offer id
// `Storage.CaaS.MinioTenant`. `Storage.CaaS.MinIO` is the catalogue *service
// type* the offer fills, not an offer id, so no handler is keyed on it.
export const MinIO = defineOffer<
  'Storage.ObjectStorage',
  {storageClass?: string}
>({
  satisfies: 'Storage.ObjectStorage',
  offerType: 'Storage.CaaS.MinioTenant',
  deliveryModel: 'CaaS',
});

// ── Storage.RelationalDbms offers ────────────────────────────────────────────
export const AzurePostgresDbms = defineOffer<
  'Storage.RelationalDbms',
  {region?: string; resourceGroup: string}
>({
  satisfies: 'Storage.RelationalDbms',
  offerType: 'Storage.PaaS.AzurePostgresDbms',
  provider: 'Azure',
  deliveryModel: 'PaaS',
  instantiate: dbmsInstantiate(
    'Storage.PaaS.AzurePostgresDbms',
    'Azure',
    'Storage.PaaS.AzurePostgresDatabase',
  ),
});
export const GcpPostgresDbms = defineOffer<
  'Storage.RelationalDbms',
  {region?: string; tier: string}
>({
  satisfies: 'Storage.RelationalDbms',
  offerType: 'Storage.PaaS.GcpPostgresDbms',
  provider: 'GCP',
  deliveryModel: 'PaaS',
  instantiate: dbmsInstantiate(
    'Storage.PaaS.GcpPostgresDbms',
    'GCP',
    'Storage.PaaS.GcpPostgresDatabase',
  ),
});
/**
 * Google Cloud SQL for MySQL, DBMS tier only.
 *
 * **Child components are not supported, and selecting this offer for a DBMS that
 * has any is an error.** Every other DBMS offer here emits one Database live
 * component per child added via `withDatabases`; this one has no Database offer
 * to emit them as, because `Storage.PaaS.GcpMySqlDatabase` does not exist yet.
 * It therefore omits `instantiate` — and `toLiveSystem`'s child-drop guard turns
 * that into a thrown error naming this offer and every dropped child, at
 * authoring time, before anything reaches a cloud. That is the loud failure, and
 * it is why omitting `instantiate` beats emitting a database type no agent
 * handles: that alternative builds a Live System successfully and leaves the
 * child component Instantiating forever. Adding `instantiate` once the Database
 * offer lands is additive and non-breaking; removing it later would not be.
 *
 * The config keys are spelled the way the GCP agent reads them. `tier` on the
 * PostgreSQL offer above is not one of them — the agent reads `instanceTier` and
 * has never read `tier` — so do not copy that spelling here. A parameter the
 * published contract does not declare is pruned before it reaches the agent, so
 * a differently-spelled key is not merely ignored, it is silently deleted.
 *
 * `network` is OPTIONAL, and is declared here where the PostgreSQL offer above
 * omits it entirely — the difference that remains between the two.
 *
 * It was required until the agent learned to derive it. Omitting it now selects
 * the environment's spoke network: `GcpDatabaseInstance.getFromComponent` reads
 * this component parameter first and, when it is blank, falls back to
 * `CloudSqlNetworkFallback`, built from the spoke network that
 * `GcpInfrastructureComponent` resolves for every GCP component before any
 * parameter of this Offer is read. The published contract agrees —
 * `GcpMySqlInstantiatorStrategy` declares it `ParamSpec.derived(..., "defaults to
 * the environment's spoke network when absent")`, not `required` — so a config
 * that omits it is neither pruned nor rejected.
 *
 * Declaring it anyway, rather than dropping it as the PostgreSQL offer does, is
 * the point: an author-supplied value WINS over the derivation, and it is the
 * only route for a component whose `projectId` overrides the environment's.
 * `CloudSqlNetworkFallback.forComponent` refuses to derive across projects —
 * the spoke name is environment-scoped while the create path is composed from
 * the overridden `projectId`, so deriving would name a VPC that does not exist
 * there — and fails with a message telling the author to supply this key. The
 * PostgreSQL offer, which omits it, leaves that author no route at all.
 *
 * No value is seeded, because a VPC name is environment-specific and a plausible
 * wrong one passes every lint and fails only against the vendor.
 */
export const GcpMySqlDbms = defineOffer<
  'Storage.RelationalDbms',
  {
    network?: string;
    region?: string;
    instanceTier?: string;
    instanceEdition?: string;
    instanceDataDiskSizeGb?: number;
  }
>({
  satisfies: 'Storage.RelationalDbms',
  offerType: 'Storage.PaaS.GcpMySqlDbms',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
/**
 * Amazon RDS for PostgreSQL. One offer covers both shapes RDS provides, selected
 * by `mode`: an Aurora cluster with Serverless v2 members (`aurora-serverless`,
 * the default) or a single Multi-AZ provisioned instance
 * (`provisioned-instance`). Both expose the same connection facts downstream, so
 * moving between them does not change what a linked workload reads.
 *
 * Encryption at rest, private-only networking, IAM database authentication and
 * log export are applied by the agent and are deliberately not configurable.
 *
 * A DB subnet group spans at least two Availability Zones, so the Subnets this
 * DBMS lives in are declared on the blueprint component — the agent will not
 * pick them.
 */
export const AwsRdsPostgresDbms = defineOffer<
  'Storage.RelationalDbms',
  {
    region?: string;
    mode?: 'aurora-serverless' | 'provisioned-instance';
    version?: string;
    instanceClass?: string;
    administratorLogin?: string;
    /** Provisioned mode only. */
    allocatedStorageGb?: number;
    /** Provisioned mode only — the ceiling storage autoscaling grows to. */
    maxAllocatedStorageGb?: number;
    /** Aurora Serverless v2 only. */
    minAcu?: number;
    /** Aurora Serverless v2 only. */
    maxAcu?: number;
    /** Aurora mode only. Defaults to 1 so losing the writer's AZ needs no operator. */
    readerCount?: number;
    /** Provisioned mode only. Defaults to true. */
    multiAz?: boolean;
    backupRetentionDays?: number;
    deletionProtection?: boolean;
    /** Provisioned mode only; the agent defaults to gp3. */
    storageType?: AwsRdsStorageType;
    port?: number;
  }
>({
  satisfies: 'Storage.RelationalDbms',
  offerType: 'Storage.PaaS.AwsRdsPostgres',
  validate: (self, _all, config) => {
    if (
      config.storageType !== undefined &&
      !AWS_RDS_STORAGE_TYPES.includes(config.storageType)
    ) {
      throw new Error(
        `AwsRdsPostgresDbms '${self.id}': storageType '${config.storageType}' is not ` +
          `one of ${AWS_RDS_STORAGE_TYPES.join(', ')}.`,
      );
    }
  },
  provider: 'AWS',
  deliveryModel: 'PaaS',
  instantiate: dbmsInstantiate(
    'Storage.PaaS.AwsRdsPostgres',
    'AWS',
    'Storage.PaaS.AwsRdsPostgresDatabase',
  ),
});
export const ArubaMySqlDbms = defineOffer<
  'Storage.RelationalDbms',
  {region?: string}
>({
  satisfies: 'Storage.RelationalDbms',
  offerType: 'Storage.PaaS.ArubaMySqlDbms',
  provider: 'Aruba',
  deliveryModel: 'PaaS',
  instantiate: dbmsInstantiate(
    'Storage.PaaS.ArubaMySqlDbms',
    'Aruba',
    'Storage.PaaS.ArubaMySqlDatabase',
  ),
});

// ── Storage.RelationalDatabase offers ────────────────────────────────────────
export const AzurePostgresDatabase = defineOffer<
  'Storage.RelationalDatabase',
  {}
>({
  satisfies: 'Storage.RelationalDatabase',
  offerType: 'Storage.PaaS.AzurePostgresDatabase',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcpPostgresDatabase = defineOffer<
  'Storage.RelationalDatabase',
  {}
>({
  satisfies: 'Storage.RelationalDatabase',
  offerType: 'Storage.PaaS.GcpPostgresDatabase',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});

export const AwsRdsPostgresDatabase = defineOffer<
  'Storage.RelationalDatabase',
  {
    /** Defaults to the component id mapped onto a legal PostgreSQL identifier. */
    databaseName?: string;
    schema?: string;
  }
>({
  satisfies: 'Storage.RelationalDatabase',
  offerType: 'Storage.PaaS.AwsRdsPostgresDatabase',
  provider: 'AWS',
  deliveryModel: 'PaaS',
});

// ── OpenShift persistent storage (RedHat, CaaS) ──────────────────────────────
export const OpenshiftPersistentVolume = defineOffer<
  'Storage.ObjectStorage',
  {storageSize?: string; storageClassName?: string}
>({
  satisfies: 'Storage.ObjectStorage',
  offerType: 'Storage.CaaS.OpenshiftPersistentVolume',
  provider: 'RedHat',
  deliveryModel: 'CaaS',
});
