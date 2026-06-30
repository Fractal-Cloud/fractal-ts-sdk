/**
 * offers/big_data.ts — BigData domain Offers (Catalogue, Level 3, concrete).
 *
 * Each offer declares which Component it satisfies, its 3-part offer type, its
 * delivery model and (for cloud offers) its vendor. Vendor-neutral CaaS offers
 * OMIT `provider` — they run on any cluster and are identified by deliveryModel
 * + offerType. Vendor knobs live in each offer's config type.
 */
import {defineOffer} from '../core';

// ── ComputeCluster offers ────────────────────────────────────────────────────
export const AwsDatabricksCluster = defineOffer<
  'BigData.ComputeCluster',
  Record<string, never>
>({
  satisfies: 'BigData.ComputeCluster',
  offerType: 'BigData.PaaS.AwsDatabricksCluster',
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
export const AzureDatabricksCluster = defineOffer<
  'BigData.ComputeCluster',
  Record<string, never>
>({
  satisfies: 'BigData.ComputeCluster',
  offerType: 'BigData.PaaS.AzureDatabricksCluster',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcpDatabricksCluster = defineOffer<
  'BigData.ComputeCluster',
  Record<string, never>
>({
  satisfies: 'BigData.ComputeCluster',
  offerType: 'BigData.PaaS.GcpDatabricksCluster',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
export const CaaSSparkCluster = defineOffer<
  'BigData.ComputeCluster',
  Record<string, never>
>({
  satisfies: 'BigData.ComputeCluster',
  offerType: 'BigData.CaaS.CaaSSparkCluster',
  deliveryModel: 'CaaS',
});

// ── DataProcessingJob offers ─────────────────────────────────────────────────
export const AwsDatabricksJob = defineOffer<
  'BigData.DataProcessingJob',
  Record<string, never>
>({
  satisfies: 'BigData.DataProcessingJob',
  offerType: 'BigData.PaaS.AwsDatabricksJob',
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
export const AzureDatabricksJob = defineOffer<
  'BigData.DataProcessingJob',
  Record<string, never>
>({
  satisfies: 'BigData.DataProcessingJob',
  offerType: 'BigData.PaaS.AzureDatabricksJob',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcpDatabricksJob = defineOffer<
  'BigData.DataProcessingJob',
  Record<string, never>
>({
  satisfies: 'BigData.DataProcessingJob',
  offerType: 'BigData.PaaS.GcpDatabricksJob',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
export const CaaSSparkJob = defineOffer<
  'BigData.DataProcessingJob',
  Record<string, never>
>({
  satisfies: 'BigData.DataProcessingJob',
  offerType: 'BigData.CaaS.CaaSSparkJob',
  deliveryModel: 'CaaS',
});

// ── MlExperiment offers ──────────────────────────────────────────────────────
export const AwsDatabricksMlflow = defineOffer<
  'BigData.MlExperiment',
  Record<string, never>
>({
  satisfies: 'BigData.MlExperiment',
  offerType: 'BigData.PaaS.AwsDatabricksMlflow',
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
export const AzureDatabricksMlflow = defineOffer<
  'BigData.MlExperiment',
  Record<string, never>
>({
  satisfies: 'BigData.MlExperiment',
  offerType: 'BigData.PaaS.AzureDatabricksMlflow',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcpDatabricksMlflow = defineOffer<
  'BigData.MlExperiment',
  Record<string, never>
>({
  satisfies: 'BigData.MlExperiment',
  offerType: 'BigData.PaaS.GcpDatabricksMlflow',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
export const CaaSMlflow = defineOffer<
  'BigData.MlExperiment',
  Record<string, never>
>({
  satisfies: 'BigData.MlExperiment',
  offerType: 'BigData.CaaS.CaaSMlflow',
  deliveryModel: 'CaaS',
});

// ── Datalake offers ──────────────────────────────────────────────────────────
export const AwsS3Datalake = defineOffer<'BigData.Datalake', {bucket: string}>({
  satisfies: 'BigData.Datalake',
  offerType: 'BigData.PaaS.AwsS3Datalake',
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
export const AzureDatalake = defineOffer<
  'BigData.Datalake',
  {resourceGroup: string}
>({
  satisfies: 'BigData.Datalake',
  offerType: 'BigData.PaaS.AzureDatalake',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcpDatalake = defineOffer<
  'BigData.Datalake',
  {bucketName: string}
>({
  satisfies: 'BigData.Datalake',
  offerType: 'BigData.PaaS.GcpDatalake',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});

// ── DistributedDataProcessing offers ─────────────────────────────────────────
export const AwsDatabricks = defineOffer<
  'BigData.DistributedDataProcessing',
  {pricingTier: string}
>({
  satisfies: 'BigData.DistributedDataProcessing',
  offerType: 'BigData.PaaS.AwsDatabricks',
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
export const AzureDatabricks = defineOffer<
  'BigData.DistributedDataProcessing',
  {pricingTier: string}
>({
  satisfies: 'BigData.DistributedDataProcessing',
  offerType: 'BigData.PaaS.AzureDatabricks',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcpDatabricks = defineOffer<
  'BigData.DistributedDataProcessing',
  {pricingTier: string}
>({
  satisfies: 'BigData.DistributedDataProcessing',
  offerType: 'BigData.PaaS.GcpDatabricks',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
