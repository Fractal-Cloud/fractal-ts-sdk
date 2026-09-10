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
import {KUBERNETES_WORKLOAD_OFFER_TYPE} from './offer_type_ids';
import {withContractImageName} from './kubernetes_workload_contract';

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
/**
 * Vendor-neutral: runs on any Kubernetes cluster, so `provider` is omitted.
 *
 * The neutral `Workload` component records a container image under `image`.
 * Of the five offers that satisfy this component, only two claim a strategy
 * that reads an image at all — `OpenshiftWorkload`, which REQUIRES `image`,
 * and `AzureContainerApp`, which reads `image`. `EcsService` and `CloudRun`
 * both map to a phantom strategy whose declared parameter contract is empty,
 * so they consume nothing. This offer is the lone outlier: the caas-k8s agent
 * reads `containerImage` and nothing else. Translating at the outlier is
 * therefore right, and renaming the neutral parameter would break OpenShift.
 *
 * Emitting `image` was a silent data loss, not a visible error: the parameter
 * contract prunes names it does not declare, so the value never reached the
 * agent, `containerImage` arrived empty and the handler correctly refused the
 * component with `containerImage is required when manifestUri is not set`.
 *
 * A `Workload` added as a CHILD of a ContainerPlatform never reaches this
 * `instantiate` — see `withContractImageName`, which both paths share.
 */
export const K8sWorkload = defineOffer<
  'CustomWorkloads.Workload',
  {namespace?: string}
>({
  satisfies: 'CustomWorkloads.Workload',
  // Exported symbol name is public API and stays `K8sWorkload`; only the wire
  // value is pinned to the id the catalogue and the caas-k8s agent agree on.
  offerType: KUBERNETES_WORKLOAD_OFFER_TYPE,
  deliveryModel: 'CaaS',
  instantiate: (ctx, cfg) => [
    {
      id: ctx.id,
      displayName: ctx.displayName,
      type: KUBERNETES_WORKLOAD_OFFER_TYPE,
      // `provider` is deliberately absent: this offer is vendor-neutral. If one
      // is ever added to the spec above it must be added here too — a custom
      // `instantiate` does not inherit the default path's `provider`.
      deliveryModel: 'CaaS',
      parameters: withContractImageName(
        {...ctx.parameters, ...cfg},
        ctx.id,
        ctx.locked ?? [],
      ),
      dependencies: ctx.dependencies,
      links: ctx.links,
    },
  ],
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
