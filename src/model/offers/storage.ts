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
      type: dbmsType,
      provider,
      deliveryModel: 'PaaS',
      parameters: {...ctx.parameters, ...(config as Record<string, unknown>)},
      dependencies: [...ctx.dependencies],
      links: [...ctx.links],
    },
    ...ctx.children.map(child => ({
      id: child.id,
      type: databaseType,
      provider,
      deliveryModel: 'PaaS' as const,
      parameters: {...child.parameters},
      dependencies: [...child.dependencies],
      links: [...child.links],
    })),
  ];

// ── Storage.ObjectStorage offers ─────────────────────────────────────────────
export const AwsS3 = defineOffer<
  'Storage.ObjectStorage',
  {bucketRegion: string}
>({
  satisfies: 'Storage.ObjectStorage',
  offerType: 'Storage.PaaS.S3',
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
export const AzureBlob = defineOffer<
  'Storage.ObjectStorage',
  {accountTier: string}
>({
  satisfies: 'Storage.ObjectStorage',
  offerType: 'Storage.PaaS.AzureBlob',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcsBucket = defineOffer<
  'Storage.ObjectStorage',
  {location: string}
>({
  satisfies: 'Storage.ObjectStorage',
  offerType: 'Storage.PaaS.GcsBucket',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
// Vendor-neutral self-hosted — runs on any cluster, so no `provider`.
export const MinIO = defineOffer<
  'Storage.ObjectStorage',
  {storageClass?: string}
>({
  satisfies: 'Storage.ObjectStorage',
  offerType: 'Storage.CaaS.MinIO',
  deliveryModel: 'CaaS',
});

// ── Storage.RelationalDbms offers ────────────────────────────────────────────
export const AzurePostgresDbms = defineOffer<
  'Storage.RelationalDbms',
  {resourceGroup: string}
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
  {tier: string}
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
export const ArubaMySqlDbms = defineOffer<
  'Storage.RelationalDbms',
  {region: string}
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
