/**
 * offers/big_data.ts — BigData domain Offers (Catalogue, Level 3, concrete).
 *
 * Each offer declares which Component it satisfies, its 3-part offer type, its
 * delivery model and (for cloud offers) its vendor. Vendor-neutral CaaS offers
 * OMIT `provider` — they run on any cluster and are identified by deliveryModel
 * + offerType. Vendor knobs live in each offer's config type.
 *
 * Region: cloud-provider offers carry an optional `region`; omit it to inherit
 * the environment region (unchanged behavior). Vendor-neutral CaaS offers run
 * on a cluster and take their region from it, so they do NOT expose `region`.
 */
import {defineOffer} from '../core';

// ── ComputeCluster offers ────────────────────────────────────────────────────
export const AwsDatabricksCluster = defineOffer<
  'BigData.ComputeCluster',
  {region?: string}
>({
  satisfies: 'BigData.ComputeCluster',
  offerType: 'BigData.PaaS.AwsDatabricksCluster',
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
export const AzureDatabricksCluster = defineOffer<
  'BigData.ComputeCluster',
  {region?: string}
>({
  satisfies: 'BigData.ComputeCluster',
  offerType: 'BigData.PaaS.AzureDatabricksCluster',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcpDatabricksCluster = defineOffer<
  'BigData.ComputeCluster',
  {region?: string}
>({
  satisfies: 'BigData.ComputeCluster',
  offerType: 'BigData.PaaS.GcpDatabricksCluster',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
// Symbol keeps the `CaaS` prefix (public API); the wire value is the
// catalogue offer id the caas-k8s handler registry is keyed on.
export const CaaSSparkCluster = defineOffer<
  'BigData.ComputeCluster',
  Record<string, never>
>({
  satisfies: 'BigData.ComputeCluster',
  offerType: 'BigData.CaaS.SparkCluster',
  deliveryModel: 'CaaS',
});

// ── DataProcessingJob offers ─────────────────────────────────────────────────
export const AwsDatabricksJob = defineOffer<
  'BigData.DataProcessingJob',
  {region?: string}
>({
  satisfies: 'BigData.DataProcessingJob',
  offerType: 'BigData.PaaS.AwsDatabricksJob',
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
export const AzureDatabricksJob = defineOffer<
  'BigData.DataProcessingJob',
  {region?: string}
>({
  satisfies: 'BigData.DataProcessingJob',
  offerType: 'BigData.PaaS.AzureDatabricksJob',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcpDatabricksJob = defineOffer<
  'BigData.DataProcessingJob',
  {region?: string}
>({
  satisfies: 'BigData.DataProcessingJob',
  offerType: 'BigData.PaaS.GcpDatabricksJob',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
// Symbol vs wire value: see CaaSSparkCluster above.
export const CaaSSparkJob = defineOffer<
  'BigData.DataProcessingJob',
  Record<string, never>
>({
  satisfies: 'BigData.DataProcessingJob',
  offerType: 'BigData.CaaS.SparkJob',
  deliveryModel: 'CaaS',
});

// ── MlExperiment offers ──────────────────────────────────────────────────────
export const AwsDatabricksMlflow = defineOffer<
  'BigData.MlExperiment',
  {region?: string}
>({
  satisfies: 'BigData.MlExperiment',
  offerType: 'BigData.PaaS.AwsDatabricksMlflow',
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
export const AzureDatabricksMlflow = defineOffer<
  'BigData.MlExperiment',
  {region?: string}
>({
  satisfies: 'BigData.MlExperiment',
  offerType: 'BigData.PaaS.AzureDatabricksMlflow',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcpDatabricksMlflow = defineOffer<
  'BigData.MlExperiment',
  {region?: string}
>({
  satisfies: 'BigData.MlExperiment',
  offerType: 'BigData.PaaS.GcpDatabricksMlflow',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
// MLflow is published by the catalogue as `BigData.CaaS.SparkMlExperiment`
// (displayName 'MLflow Experiment'); `BigData.CaaS.MLflow` is its service type.
export const CaaSMlflow = defineOffer<
  'BigData.MlExperiment',
  Record<string, never>
>({
  satisfies: 'BigData.MlExperiment',
  offerType: 'BigData.CaaS.SparkMlExperiment',
  deliveryModel: 'CaaS',
});

// ── Datalake offers ──────────────────────────────────────────────────────────
export const AwsS3Datalake = defineOffer<
  'BigData.Datalake',
  {region?: string; bucket: string}
>({
  satisfies: 'BigData.Datalake',
  offerType: 'BigData.PaaS.AwsS3Datalake',
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
export const AzureDatalake = defineOffer<
  'BigData.Datalake',
  {region?: string; resourceGroup: string}
>({
  satisfies: 'BigData.Datalake',
  offerType: 'BigData.PaaS.AzureDatalake',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcpDatalake = defineOffer<
  'BigData.Datalake',
  {region?: string; bucketName: string}
>({
  satisfies: 'BigData.Datalake',
  offerType: 'BigData.PaaS.GcpDatalake',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});

// ── DistributedDataProcessing offers ─────────────────────────────────────────
/**
 * `credentialsId` and `storageConfigurationId` are the Databricks *account-level*
 * credential configuration and storage configuration the workspace is created
 * from. The agent reads both with `requireStringFromMap` and fails the component
 * with `REQUIRED_PARAMETER_MISSING` when either is absent or blank, and neither
 * can be derived: they name artifacts created in the Databricks account console,
 * outside anything the agent or this SDK can see. They are environment inputs,
 * so they are required config here rather than defaulted.
 */
export const AwsDatabricks = defineOffer<
  'BigData.DistributedDataProcessing',
  {
    region?: string;
    pricingTier: string;
    credentialsId: string;
    storageConfigurationId: string;
  }
>({
  satisfies: 'BigData.DistributedDataProcessing',
  offerType: 'BigData.PaaS.AwsDatabricks',
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
export const AzureDatabricks = defineOffer<
  'BigData.DistributedDataProcessing',
  {region?: string; pricingTier: string}
>({
  satisfies: 'BigData.DistributedDataProcessing',
  offerType: 'BigData.PaaS.AzureDatabricks',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcpDatabricks = defineOffer<
  'BigData.DistributedDataProcessing',
  {region?: string; pricingTier: string}
>({
  satisfies: 'BigData.DistributedDataProcessing',
  offerType: 'BigData.PaaS.GcpDatabricks',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
