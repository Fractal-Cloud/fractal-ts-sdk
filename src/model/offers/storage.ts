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

// ── Storage.ObjectStorage offers ─────────────────────────────────────────────
export const AwsS3 = defineOffer<'Storage.ObjectStorage', {region?: string}>({
  satisfies: 'Storage.ObjectStorage',
  offerType: 'Storage.PaaS.AwsS3',
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
export const AzureBlob = defineOffer<
  'Storage.ObjectStorage',
  {region?: string; accountTier: string}
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
    port?: number;
  }
>({
  satisfies: 'Storage.RelationalDbms',
  offerType: 'Storage.PaaS.AwsRdsPostgres',
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
