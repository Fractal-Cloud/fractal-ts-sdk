/**
 * offers/custom_workloads.ts — CustomWorkloads domain Offers (Catalogue, Level 3,
 * concrete).
 *
 * Each offer declares which Component it satisfies, its 3-part offer type, its
 * delivery model and (for cloud offers) its vendor. Vendor-neutral CaaS offers
 * OMIT `provider` — they run on any cluster and are identified by deliveryModel
 * + offerType. Vendor knobs live in each offer's config type.
 */
import {defineOffer} from '../core';

// ── Workload offers ──────────────────────────────────────────────────────────
export const EcsService = defineOffer<
  'CustomWorkloads.Workload',
  {region?: string; launchType: string}
>({
  satisfies: 'CustomWorkloads.Workload',
  offerType: 'CustomWorkloads.PaaS.AwsEcsService',
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
export const CloudRun = defineOffer<
  'CustomWorkloads.Workload',
  {region?: string}
>({
  satisfies: 'CustomWorkloads.Workload',
  offerType: 'CustomWorkloads.PaaS.GcpCloudRun',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});
export const AzureContainerApp = defineOffer<
  'CustomWorkloads.Workload',
  {region?: string; resourceGroup: string}
>({
  satisfies: 'CustomWorkloads.Workload',
  offerType: 'CustomWorkloads.PaaS.AzureContainerApp',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const OpenshiftWorkload = defineOffer<
  'CustomWorkloads.Workload',
  {namespace?: string}
>({
  satisfies: 'CustomWorkloads.Workload',
  offerType: 'CustomWorkloads.CaaS.OpenshiftWorkload',
  provider: 'RedHat',
  deliveryModel: 'CaaS',
});
// Vendor-neutral: runs on any Kubernetes cluster, so `provider` is omitted.
export const K8sWorkload = defineOffer<
  'CustomWorkloads.Workload',
  {namespace?: string}
>({
  satisfies: 'CustomWorkloads.Workload',
  offerType: 'CustomWorkloads.CaaS.K8sWorkload',
  deliveryModel: 'CaaS',
});

// ── Function offers ──────────────────────────────────────────────────────────
export const AwsLambda = defineOffer<
  'CustomWorkloads.Function',
  {region?: string; roleArn: string; handler: string}
>({
  satisfies: 'CustomWorkloads.Function',
  offerType: 'CustomWorkloads.FaaS.AwsLambda',
  provider: 'AWS',
  deliveryModel: 'FaaS',
});
export const AzureFunction = defineOffer<
  'CustomWorkloads.Function',
  {region?: string}
>({
  satisfies: 'CustomWorkloads.Function',
  offerType: 'CustomWorkloads.FaaS.AzureFunction',
  provider: 'Azure',
  deliveryModel: 'FaaS',
});
export const GcpFunction = defineOffer<
  'CustomWorkloads.Function',
  {region?: string; entryPoint: string}
>({
  satisfies: 'CustomWorkloads.Function',
  offerType: 'CustomWorkloads.FaaS.GcpFunction',
  provider: 'GCP',
  deliveryModel: 'FaaS',
});
