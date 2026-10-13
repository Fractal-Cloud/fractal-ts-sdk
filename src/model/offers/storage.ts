/**
 * offers/storage.ts — Storage domain Offers (Catalogue, Level 3).
 *
 * Concrete, vendor-specific implementations declaring which abstract Storage
 * Component each satisfies. Vendor knobs live in each offer's config only.
 * Vendor-neutral self-hosted offers (e.g. MinIO on any cluster) omit `provider`.
 */
import type {NeutralRule} from '../neutral_rule';
import {applyNeutralRules} from '../apply_neutral_rules';
import {toContractKey, unsupported, unsupportedUnless} from './neutral_rules';
import {
  Storage_CaaS_MinioTenant,
  Storage_PaaS_ArubaMySqlDbms,
  Storage_PaaS_AwsRdsMySql,
  Storage_PaaS_AwsRdsMySqlDatabase,
  Storage_PaaS_AwsRdsPostgres,
  Storage_PaaS_AwsRdsPostgresDatabase,
  Storage_PaaS_AwsS3,
  Storage_PaaS_AzureBlob,
  Storage_PaaS_AzurePostgresDatabase,
  Storage_PaaS_AzurePostgresDbms,
  Storage_PaaS_GcpGcsBucket,
  Storage_PaaS_GcpMySqlDbms,
  Storage_PaaS_GcpPostgresDatabase,
  Storage_PaaS_GcpPostgresDbms,
} from './generated/storage';
import type {ContractConfig} from './contract/contract_config';
import {defineOffer} from '../core';
import type {
  InstantiationContext,
  LiveSystemComponent,
  Provider,
} from '../core';
import type {AwsRdsDbmsConfig} from './aws_rds_dbms_config';
import type {ComponentValidator} from './component_validator';
import {allOf, onlyFor} from './cross_component_rules';
import {
  databaseRules,
  gcpDatabaseRules,
  mysqlDatabaseNamesDistinct,
  rdsDbmsSubnets,
} from './database_rules';
import {bucketLinksDeclareAccess} from './link_setting_rules';
import {onKubernetesCluster} from './kubernetes_placement';

// ── Cross-component rules ────────────────────────────────────────────────────
// What a database needs from its Live System, checked on a selected database
// and on every database a DBMS emits as its child.
const AWS_RDS_POSTGRES_DBMS_TYPES = [
  Storage_PaaS_AwsRdsPostgres.offerType,
  'Storage.PaaS.PostgreSqlDbms',
];
const AWS_RDS_MYSQL_DBMS_TYPES = [Storage_PaaS_AwsRdsMySql.offerType];
const AZURE_POSTGRES_DBMS_TYPES = [
  Storage_PaaS_AzurePostgresDbms.offerType,
  'Storage.PaaS.PostgreSqlDbms',
];
const GCP_POSTGRES_DBMS_TYPES = [
  Storage_PaaS_GcpPostgresDbms.offerType,
  'Storage.PaaS.PostgreSqlDbms',
];
const awsRdsPostgresDatabaseRules = databaseRules(
  AWS_RDS_POSTGRES_DBMS_TYPES,
  'AwsRdsPostgresDbms',
);
const awsRdsMySqlDatabaseRules = allOf(
  databaseRules(AWS_RDS_MYSQL_DBMS_TYPES, 'AwsRdsMySqlDbms'),
  mysqlDatabaseNamesDistinct(
    Storage_PaaS_AwsRdsMySqlDatabase.offerType,
    AWS_RDS_MYSQL_DBMS_TYPES,
  ),
);
const azurePostgresDatabaseRules = databaseRules(
  AZURE_POSTGRES_DBMS_TYPES,
  'AzurePostgresDbms',
);
const gcpPostgresDatabaseRules = gcpDatabaseRules(GCP_POSTGRES_DBMS_TYPES);
/** An RDS DBMS's declared subnets, and the rules of the databases it emits. */
const rdsDbmsRules = (
  dbmsType: string,
  databaseType: string,
  database: ComponentValidator,
): ComponentValidator =>
  allOf(
    onlyFor(
      [dbmsType],
      rdsDbmsSubnets('NetworkAndCompute.IaaS.AwsSubnet', [
        'NetworkAndCompute.IaaS.AwsVpc',
      ]),
    ),
    onlyFor([databaseType], database),
  );

/**
 * A DBMS offer emits itself PLUS one Database live component per child the
 * application added via `withDatabases` — each database lives in the DBMS's
 * vendor family, so it is not independently offer-selected. Swap the DBMS offer
 * and the databases' offer type follows.
 */
/**
 * The neutral `RelationalDatabase` parameters an RDS database cannot honor,
 * applied both when it is selected on its own and when a DBMS emits it.
 */
const RDS_DATABASE_RULES: Readonly<Record<string, NeutralRule>> = {
  charset: unsupported(
    'the agent creates every database with its engine default character set',
  ),
  collation: unsupported(
    'the agent creates every database with its engine default collation',
  ),
};

const dbmsInstantiate =
  (
    dbmsType: string,
    provider: Provider,
    databaseType: string,
    databaseRules?: Readonly<Record<string, NeutralRule>>,
  ) =>
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
      parameters: applyNeutralRules({
        offerType: databaseType,
        componentId: child.id,
        parameters: child.parameters,
        locked: child.locked ?? [],
        config: {},
        rules: databaseRules,
      }),
      dependencies: [...child.dependencies],
      links: [...child.links],
    })),
  ];

// ── Storage.ObjectStorage offers ─────────────────────────────────────────────
export const AwsS3 = defineOffer<
  'Storage.ObjectStorage',
  ContractConfig<
    typeof Storage_PaaS_AwsS3,
    'versioningEnabled',
    {
      /**
       * Expire every object this many days after it was written (and abort
       * incomplete multipart uploads after a day). Absent: objects never expire.
       */
      lifecycleExpirationDays?: number;
    }
  >
>({
  satisfies: 'Storage.ObjectStorage',
  contract: Storage_PaaS_AwsS3,
  provider: 'AWS',
  deliveryModel: 'PaaS',
  validate: bucketLinksDeclareAccess,
  neutral: {
    encryption: unsupportedUnless(
      v => v === 'at-rest',
      'S3 always encrypts at rest',
    ),
    publicAccess: unsupportedUnless(
      v => v === false,
      'the agent keeps every bucket private',
    ),
    retentionDays: toContractKey(Storage_PaaS_AwsS3, 'lifecycleExpirationDays'),
    storageClass: unsupported('the agent sets no storage class'),
    tags: unsupported('the agent applies no tags to it'),
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
  ContractConfig<typeof Storage_PaaS_AzureBlob, 'encryption' | 'publicAccess'>
>({
  satisfies: 'Storage.ObjectStorage',
  contract: Storage_PaaS_AzureBlob,
  provider: 'Azure',
  deliveryModel: 'PaaS',
  validate: bucketLinksDeclareAccess,
  neutral: {
    retentionDays: unsupported('the agent sets no retention'),
    storageClass: unsupported('the tier is set by accessTier'),
    tags: unsupported('the agent applies no tags to it'),
    versioningEnabled: unsupported('the agent sets no blob versioning'),
  },
});
export const GcsBucket = defineOffer<
  'Storage.ObjectStorage',
  ContractConfig<
    typeof Storage_PaaS_GcpGcsBucket,
    'storageClass' | 'versioningEnabled'
  >
>({
  satisfies: 'Storage.ObjectStorage',
  contract: Storage_PaaS_GcpGcsBucket,
  provider: 'GCP',
  deliveryModel: 'PaaS',
  validate: bucketLinksDeclareAccess,
  neutral: {
    encryption: unsupportedUnless(
      v => v === 'at-rest',
      'Cloud Storage always encrypts at rest',
    ),
    publicAccess: unsupportedUnless(
      v => v === false,
      'the agent keeps every bucket private',
    ),
    retentionDays: unsupported('the agent sets no retention'),
    tags: unsupported('the agent applies no tags to it'),
  },
});
// Vendor-neutral self-hosted — runs on any cluster, so no `provider`.
// Exported symbol stays `MinIO`; the wire value is the catalogue offer id
// `Storage.CaaS.MinioTenant`. `Storage.CaaS.MinIO` is the catalogue *service
// type* the offer fills, not an offer id, so no handler is keyed on it.
export const MinIO = defineOffer<
  'Storage.ObjectStorage',
  ContractConfig<typeof Storage_CaaS_MinioTenant>
>({
  satisfies: 'Storage.ObjectStorage',
  contract: Storage_CaaS_MinioTenant,
  deliveryModel: 'CaaS',
  validate: allOf(onKubernetesCluster, bucketLinksDeclareAccess),
  neutral: {
    encryption: unsupported('the agent configures no encryption'),
    publicAccess: unsupportedUnless(
      v => v === false,
      'the agent exposes no bucket publicly',
    ),
    retentionDays: unsupported('the agent sets no retention'),
    tags: unsupported('the agent applies no tags to it'),
    versioningEnabled: unsupported('the agent sets no bucket versioning'),
  },
});

// ── Storage.RelationalDbms offers ────────────────────────────────────────────
export const AzurePostgresDbms = defineOffer<
  'Storage.RelationalDbms',
  ContractConfig<
    typeof Storage_PaaS_AzurePostgresDbms,
    'backupRetentionDays' | 'storageGb'
  >
>({
  satisfies: 'Storage.RelationalDbms',
  contract: Storage_PaaS_AzurePostgresDbms,
  provider: 'Azure',
  deliveryModel: 'PaaS',
  validate: onlyFor(
    [Storage_PaaS_AzurePostgresDatabase.offerType],
    azurePostgresDatabaseRules,
  ),
  neutral: {
    engineVersion: toContractKey(Storage_PaaS_AzurePostgresDbms, 'version'),
    highAvailability: unsupported(
      'availability is set by highAvailabilityMode',
    ),
    sizeTier: unsupported('size is set by skuName'),
  },
  instantiate: dbmsInstantiate(
    Storage_PaaS_AzurePostgresDbms.offerType,
    'Azure',
    Storage_PaaS_AzurePostgresDatabase.offerType,
  ),
});
export const GcpPostgresDbms = defineOffer<
  'Storage.RelationalDbms',
  ContractConfig<typeof Storage_PaaS_GcpPostgresDbms>
>({
  satisfies: 'Storage.RelationalDbms',
  contract: Storage_PaaS_GcpPostgresDbms,
  provider: 'GCP',
  deliveryModel: 'PaaS',
  validate: onlyFor(
    [Storage_PaaS_GcpPostgresDatabase.offerType],
    gcpPostgresDatabaseRules,
  ),
  neutral: {
    backupRetentionDays: unsupported(
      'the agent declares no such setting for Cloud SQL for PostgreSQL',
    ),
    engineVersion: unsupported(
      'the agent declares no such setting for Cloud SQL for PostgreSQL',
    ),
    highAvailability: unsupported(
      'the agent declares no such setting for Cloud SQL for PostgreSQL',
    ),
    sizeTier: unsupported(
      'the agent declares no such setting for Cloud SQL for PostgreSQL',
    ),
    storageGb: unsupported(
      'the agent declares no such setting for Cloud SQL for PostgreSQL',
    ),
  },
  instantiate: dbmsInstantiate(
    Storage_PaaS_GcpPostgresDbms.offerType,
    'GCP',
    Storage_PaaS_GcpPostgresDatabase.offerType,
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
  ContractConfig<typeof Storage_PaaS_GcpMySqlDbms>
>({
  satisfies: 'Storage.RelationalDbms',
  contract: Storage_PaaS_GcpMySqlDbms,
  provider: 'GCP',
  deliveryModel: 'PaaS',
  neutral: {
    backupRetentionDays: unsupported(
      'the agent declares no such setting for Cloud SQL for MySQL',
    ),
    engineVersion: unsupported(
      'the agent declares no such setting for Cloud SQL for MySQL',
    ),
    highAvailability: unsupported(
      'the agent declares no such setting for Cloud SQL for MySQL',
    ),
    sizeTier: unsupported(
      'the agent declares no such setting for Cloud SQL for MySQL',
    ),
    storageGb: toContractKey(
      Storage_PaaS_GcpMySqlDbms,
      'instanceDataDiskSizeGb',
    ),
  },
});
/**
 * Amazon RDS for PostgreSQL. One offer covers both shapes RDS provides, selected
 * by `mode`: an Aurora cluster with Serverless v2 members (`aurora-serverless`,
 * the default) or a single Multi-AZ provisioned instance
 * (`provisioned-instance`). Both expose the same connection facts downstream, so
 * moving between them does not change what a linked workload reads.
 *
 * Encryption at rest, private-only networking and IAM database authentication
 * are applied by the agent and are deliberately not configurable. Exporting the
 * database logs to CloudWatch is opt-in (`cloudwatchLogExports`), never a default.
 *
 * Availability defaults (instance class, readers, Multi-AZ, backup retention,
 * ACU range) come from the environment's `networkTier`. Only what is set here
 * is reconciled on an existing database; an unset key applies at create only
 * and never modifies a running one.
 *
 * With no `Subnet` dependency the agent places the database across the
 * environment spoke's private subnets (at least two Availability Zones);
 * declare `Subnet` dependencies on the blueprint component only to pin them.
 */
export const AwsRdsPostgresDbms = defineOffer<
  'Storage.RelationalDbms',
  AwsRdsDbmsConfig
>({
  satisfies: 'Storage.RelationalDbms',
  contract: Storage_PaaS_AwsRdsPostgres,
  provider: 'AWS',
  deliveryModel: 'PaaS',
  validate: rdsDbmsRules(
    Storage_PaaS_AwsRdsPostgres.offerType,
    Storage_PaaS_AwsRdsPostgresDatabase.offerType,
    awsRdsPostgresDatabaseRules,
  ),
  neutral: {
    engineVersion: toContractKey(Storage_PaaS_AwsRdsPostgres, 'version'),
    highAvailability: unsupported(
      'availability is set by multiAz and readerCount',
    ),
    sizeTier: unsupported('size is set by instanceClass or the ACU range'),
    storageGb: toContractKey(Storage_PaaS_AwsRdsPostgres, 'allocatedStorageGb'),
  },
  instantiate: dbmsInstantiate(
    Storage_PaaS_AwsRdsPostgres.offerType,
    'AWS',
    Storage_PaaS_AwsRdsPostgresDatabase.offerType,
    RDS_DATABASE_RULES,
  ),
});

/**
 * Amazon RDS for MySQL, the MySQL twin of `AwsRdsPostgresDbms`: the same keys,
 * the same two modes (`aurora-serverless`, the default, or
 * `provisioned-instance`), the same fixed security posture and the same
 * connection facts downstream, so a linked workload reads the same
 * `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USERNAME` / `DB_PASSWORD_REF`.
 *
 * Only the engine's defaults differ, and the agent owns them: `version` 8.4 and
 * `port` 3306. The master user name is at most 16 characters (MySQL's limit).
 * Its databases are emitted as `AwsRdsMySqlDatabase`.
 */
// One config for both engines holds only while the two RDS contracts declare
// the same keys; these two lines stop compiling the moment they diverge.
Storage_PaaS_AwsRdsMySql.params satisfies Record<
  keyof typeof Storage_PaaS_AwsRdsPostgres.params,
  unknown
>;
Storage_PaaS_AwsRdsPostgres.params satisfies Record<
  keyof typeof Storage_PaaS_AwsRdsMySql.params,
  unknown
>;
export const AwsRdsMySqlDbms = defineOffer<
  'Storage.RelationalDbms',
  AwsRdsDbmsConfig
>({
  satisfies: 'Storage.RelationalDbms',
  contract: Storage_PaaS_AwsRdsMySql,
  provider: 'AWS',
  deliveryModel: 'PaaS',
  validate: rdsDbmsRules(
    Storage_PaaS_AwsRdsMySql.offerType,
    Storage_PaaS_AwsRdsMySqlDatabase.offerType,
    awsRdsMySqlDatabaseRules,
  ),
  neutral: {
    engineVersion: toContractKey(Storage_PaaS_AwsRdsMySql, 'version'),
    highAvailability: unsupported(
      'availability is set by multiAz and readerCount',
    ),
    sizeTier: unsupported('size is set by instanceClass or the ACU range'),
    storageGb: toContractKey(Storage_PaaS_AwsRdsMySql, 'allocatedStorageGb'),
  },
  instantiate: dbmsInstantiate(
    Storage_PaaS_AwsRdsMySql.offerType,
    'AWS',
    Storage_PaaS_AwsRdsMySqlDatabase.offerType,
    RDS_DATABASE_RULES,
  ),
});
export const ArubaMySqlDbms = defineOffer<
  'Storage.RelationalDbms',
  ContractConfig<typeof Storage_PaaS_ArubaMySqlDbms>
>({
  satisfies: 'Storage.RelationalDbms',
  contract: Storage_PaaS_ArubaMySqlDbms,
  provider: 'Aruba',
  deliveryModel: 'PaaS',
  neutral: {
    backupRetentionDays: unsupported('the agent reads only flavorName'),
    engineVersion: unsupported('the agent reads only flavorName'),
    highAvailability: unsupported('the agent reads only flavorName'),
    sizeTier: unsupported('the agent reads only flavorName'),
    storageGb: unsupported('the agent reads only flavorName'),
  },
  instantiate: dbmsInstantiate(
    Storage_PaaS_ArubaMySqlDbms.offerType,
    'Aruba',
    'Storage.PaaS.ArubaMySqlDatabase',
  ),
});

// ── Storage.RelationalDatabase offers ────────────────────────────────────────
export const AzurePostgresDatabase = defineOffer<
  'Storage.RelationalDatabase',
  ContractConfig<
    typeof Storage_PaaS_AzurePostgresDatabase,
    'charset' | 'collation'
  >
>({
  satisfies: 'Storage.RelationalDatabase',
  contract: Storage_PaaS_AzurePostgresDatabase,
  provider: 'Azure',
  deliveryModel: 'PaaS',
  validate: azurePostgresDatabaseRules,
});
export const GcpPostgresDatabase = defineOffer<
  'Storage.RelationalDatabase',
  ContractConfig<
    typeof Storage_PaaS_GcpPostgresDatabase,
    'charset' | 'collation'
  >
>({
  satisfies: 'Storage.RelationalDatabase',
  contract: Storage_PaaS_GcpPostgresDatabase,
  provider: 'GCP',
  deliveryModel: 'PaaS',
  validate: gcpPostgresDatabaseRules,
});

export const AwsRdsPostgresDatabase = defineOffer<
  'Storage.RelationalDatabase',
  ContractConfig<
    typeof Storage_PaaS_AwsRdsPostgresDatabase,
    never,
    {
      /**
       * Defaults to the component id mapped onto a legal PostgreSQL identifier.
       * On a DBMS referenced from another Live System the default is scoped by
       * this Live System (`<liveSystem>_<componentId>_<digest>`), so set it when a
       * fixed name is needed (e.g. restoring an existing database).
       */
      databaseName?: string;
    }
  >
>({
  satisfies: 'Storage.RelationalDatabase',
  contract: Storage_PaaS_AwsRdsPostgresDatabase,
  provider: 'AWS',
  deliveryModel: 'PaaS',
  validate: awsRdsPostgresDatabaseRules,
  neutral: RDS_DATABASE_RULES,
});

/**
 * A database on an `AwsRdsMySqlDbms`, created with `utf8mb4` /
 * `utf8mb4_0900_ai_ci` (the MySQL 8.4 default). MySQL has no schema below a
 * database, so unlike `AwsRdsPostgresDatabase` there is no `schema`.
 */
export const AwsRdsMySqlDatabase = defineOffer<
  'Storage.RelationalDatabase',
  ContractConfig<
    typeof Storage_PaaS_AwsRdsMySqlDatabase,
    never,
    {
      /**
       * Defaults to the component id mapped onto a legal MySQL identifier. On a
       * DBMS referenced from another Live System the default is scoped by this
       * Live System, so set it when a fixed name is needed.
       */
      databaseName?: string;
    }
  >
>({
  satisfies: 'Storage.RelationalDatabase',
  contract: Storage_PaaS_AwsRdsMySqlDatabase,
  provider: 'AWS',
  deliveryModel: 'PaaS',
  validate: awsRdsMySqlDatabaseRules,
  neutral: RDS_DATABASE_RULES,
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
