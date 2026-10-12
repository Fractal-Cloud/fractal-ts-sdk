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
import {toContractKey, unsupported} from './neutral_rules';
import {
  BigData_CaaS_SparkCluster,
  BigData_CaaS_SparkJob,
  BigData_CaaS_SparkMlExperiment,
  BigData_PaaS_AwsDatabricks,
  BigData_PaaS_AwsDatabricksCluster,
  BigData_PaaS_AwsDatabricksJob,
  BigData_PaaS_AwsDatabricksMlflow,
  BigData_PaaS_AwsS3Datalake,
  BigData_PaaS_AzureDatabricks,
  BigData_PaaS_AzureDatabricksCluster,
  BigData_PaaS_AzureDatabricksJob,
  BigData_PaaS_AzureDatabricksMlflow,
  BigData_PaaS_AzureDatalake,
  BigData_PaaS_GcpDatabricks,
  BigData_PaaS_GcpDatabricksCluster,
  BigData_PaaS_GcpDatabricksJob,
  BigData_PaaS_GcpDatabricksMlflow,
  BigData_PaaS_GcpDatalake,
} from './generated/big_data';
import type {ContractConfig} from './contract/contract_config';
import {defineOffer} from '../core';

// ── ComputeCluster offers ────────────────────────────────────────────────────
export const AwsDatabricksCluster = defineOffer<
  'BigData.ComputeCluster',
  ContractConfig<
    typeof BigData_PaaS_AwsDatabricksCluster,
    | 'autoTerminationMinutes'
    | 'clusterName'
    | 'dataSecurityMode'
    | 'maxWorkers'
    | 'minWorkers'
    | 'sparkVersion'
  >
>({
  satisfies: 'BigData.ComputeCluster',
  contract: BigData_PaaS_AwsDatabricksCluster,
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
export const AzureDatabricksCluster = defineOffer<
  'BigData.ComputeCluster',
  ContractConfig<
    typeof BigData_PaaS_AzureDatabricksCluster,
    | 'autoTerminationMinutes'
    | 'clusterName'
    | 'dataSecurityMode'
    | 'maxWorkers'
    | 'minWorkers'
    | 'sparkVersion'
  >
>({
  satisfies: 'BigData.ComputeCluster',
  contract: BigData_PaaS_AzureDatabricksCluster,
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcpDatabricksCluster = defineOffer<
  'BigData.ComputeCluster',
  ContractConfig<
    typeof BigData_PaaS_GcpDatabricksCluster,
    | 'autoTerminationMinutes'
    | 'clusterName'
    | 'dataSecurityMode'
    | 'maxWorkers'
    | 'minWorkers'
    | 'sparkVersion'
  >
>({
  satisfies: 'BigData.ComputeCluster',
  contract: BigData_PaaS_GcpDatabricksCluster,
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
// Symbol keeps the `CaaS` prefix (public API); the wire value is the
// catalogue offer id the caas-k8s handler registry is keyed on.
export const CaaSSparkCluster = defineOffer<
  'BigData.ComputeCluster',
  ContractConfig<typeof BigData_CaaS_SparkCluster, 'sparkVersion'>
>({
  satisfies: 'BigData.ComputeCluster',
  contract: BigData_CaaS_SparkCluster,
  deliveryModel: 'CaaS',
  neutral: {
    autoTerminationMinutes: unsupported(
      'a Spark-on-Kubernetes cluster is sized by its driver and executors',
    ),
    clusterName: unsupported(
      'a Spark-on-Kubernetes cluster is sized by its driver and executors',
    ),
    dataSecurityMode: unsupported(
      'a Spark-on-Kubernetes cluster is sized by its driver and executors',
    ),
    maxWorkers: unsupported(
      'a Spark-on-Kubernetes cluster is sized by its driver and executors',
    ),
    minWorkers: unsupported(
      'a Spark-on-Kubernetes cluster is sized by its driver and executors',
    ),
  },
});

// ── DataProcessingJob offers ─────────────────────────────────────────────────
export const AwsDatabricksJob = defineOffer<
  'BigData.DataProcessingJob',
  ContractConfig<
    typeof BigData_PaaS_AwsDatabricksJob,
    'cronSchedule' | 'jobName' | 'maxRetries' | 'taskType'
  >
>({
  satisfies: 'BigData.DataProcessingJob',
  contract: BigData_PaaS_AwsDatabricksJob,
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
export const AzureDatabricksJob = defineOffer<
  'BigData.DataProcessingJob',
  ContractConfig<
    typeof BigData_PaaS_AzureDatabricksJob,
    'cronSchedule' | 'jobName' | 'maxRetries' | 'taskType'
  >
>({
  satisfies: 'BigData.DataProcessingJob',
  contract: BigData_PaaS_AzureDatabricksJob,
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcpDatabricksJob = defineOffer<
  'BigData.DataProcessingJob',
  ContractConfig<
    typeof BigData_PaaS_GcpDatabricksJob,
    'cronSchedule' | 'jobName' | 'maxRetries' | 'taskType'
  >
>({
  satisfies: 'BigData.DataProcessingJob',
  contract: BigData_PaaS_GcpDatabricksJob,
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
// Symbol vs wire value: see CaaSSparkCluster above.
export const CaaSSparkJob = defineOffer<
  'BigData.DataProcessingJob',
  ContractConfig<typeof BigData_CaaS_SparkJob, 'maxRetries'>
>({
  satisfies: 'BigData.DataProcessingJob',
  contract: BigData_CaaS_SparkJob,
  deliveryModel: 'CaaS',
  neutral: {
    cronSchedule: toContractKey(BigData_CaaS_SparkJob, 'schedule'),
    jobName: unsupported('the job is named after the component'),
    taskType: unsupported(
      'the job type is set by type and mainApplicationFile',
    ),
  },
});

// ── MlExperiment offers ──────────────────────────────────────────────────────
export const AwsDatabricksMlflow = defineOffer<
  'BigData.MlExperiment',
  ContractConfig<typeof BigData_PaaS_AwsDatabricksMlflow, 'experimentName'>
>({
  satisfies: 'BigData.MlExperiment',
  contract: BigData_PaaS_AwsDatabricksMlflow,
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
export const AzureDatabricksMlflow = defineOffer<
  'BigData.MlExperiment',
  ContractConfig<typeof BigData_PaaS_AzureDatabricksMlflow, 'experimentName'>
>({
  satisfies: 'BigData.MlExperiment',
  contract: BigData_PaaS_AzureDatabricksMlflow,
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const GcpDatabricksMlflow = defineOffer<
  'BigData.MlExperiment',
  ContractConfig<typeof BigData_PaaS_GcpDatabricksMlflow, 'experimentName'>
>({
  satisfies: 'BigData.MlExperiment',
  contract: BigData_PaaS_GcpDatabricksMlflow,
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
// MLflow is published by the catalogue as `BigData.CaaS.SparkMlExperiment`
// (displayName 'MLflow Experiment'); `BigData.CaaS.MLflow` is its service type.
export const CaaSMlflow = defineOffer<
  'BigData.MlExperiment',
  ContractConfig<typeof BigData_CaaS_SparkMlExperiment>
>({
  satisfies: 'BigData.MlExperiment',
  contract: BigData_CaaS_SparkMlExperiment,
  deliveryModel: 'CaaS',
  neutral: {
    experimentName: unsupported('the agent creates no named experiment'),
  },
});

// ── Datalake offers ──────────────────────────────────────────────────────────
export const AwsS3Datalake = defineOffer<
  'BigData.Datalake',
  ContractConfig<
    typeof BigData_PaaS_AwsS3Datalake,
    'versioningEnabled',
    {bucket: string}
  >
>({
  satisfies: 'BigData.Datalake',
  contract: BigData_PaaS_AwsS3Datalake,
  provider: 'AWS',
  deliveryModel: 'PaaS',
  neutral: {
    retentionDays: toContractKey(
      BigData_PaaS_AwsS3Datalake,
      'lifecycleExpirationDays',
    ),
  },
});
export const AzureDatalake = defineOffer<
  'BigData.Datalake',
  ContractConfig<typeof BigData_PaaS_AzureDatalake>
>({
  satisfies: 'BigData.Datalake',
  contract: BigData_PaaS_AzureDatalake,
  provider: 'Azure',
  deliveryModel: 'PaaS',
  neutral: {
    retentionDays: unsupported('the agent sets no retention'),
    versioningEnabled: unsupported('the agent sets no blob versioning'),
  },
});
export const GcpDatalake = defineOffer<
  'BigData.Datalake',
  ContractConfig<
    typeof BigData_PaaS_GcpDatalake,
    'versioningEnabled',
    {bucketName: string}
  >
>({
  satisfies: 'BigData.Datalake',
  contract: BigData_PaaS_GcpDatalake,
  provider: 'GCP',
  deliveryModel: 'PaaS',
  neutral: {
    retentionDays: unsupported('the agent sets no retention'),
  },
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
  ContractConfig<
    typeof BigData_PaaS_AwsDatabricks,
    never,
    {
      pricingTier: string;
    }
  >
>({
  satisfies: 'BigData.DistributedDataProcessing',
  contract: BigData_PaaS_AwsDatabricks,
  provider: 'AWS',
  deliveryModel: 'PaaS',
  neutral: {
    workspaceName: unsupported('the agent names the workspace itself'),
  },
});
export const AzureDatabricks = defineOffer<
  'BigData.DistributedDataProcessing',
  ContractConfig<
    typeof BigData_PaaS_AzureDatabricks,
    never,
    {pricingTier: string}
  >
>({
  satisfies: 'BigData.DistributedDataProcessing',
  contract: BigData_PaaS_AzureDatabricks,
  provider: 'Azure',
  deliveryModel: 'PaaS',
  neutral: {
    workspaceName: unsupported('the agent names the workspace itself'),
  },
});
export const GcpDatabricks = defineOffer<
  'BigData.DistributedDataProcessing',
  ContractConfig<
    typeof BigData_PaaS_GcpDatabricks,
    never,
    {pricingTier: string}
  >
>({
  satisfies: 'BigData.DistributedDataProcessing',
  contract: BigData_PaaS_GcpDatabricks,
  provider: 'GCP',
  deliveryModel: 'PaaS',
  neutral: {
    workspaceName: unsupported('the agent names the workspace itself'),
  },
});
