import type {Observability_CaaS_KubePrometheusStack} from './generated/observability';
import type {ContractConfig} from './contract/contract_config';

/**
 * Vendor knobs of the `KubePrometheusStack` offer
 * (`Observability.CaaS.KubePrometheusStack`): the caas-k8s agent's published
 * contract. The retention is the `Monitoring` component's own `retentionDays`
 * (`withRetentionDays`), so it is not offered again here.
 *
 * caas-k8s v2.0.0 removed `secretEnv` and `environmentSecretShortNames`: the
 * stack reads no environment secrets and has no `withEnvironmentSecrets`.
 * Google sign-in is the `Grafana` offer's (`Observability.CaaS.Grafana`, on a
 * `Visualization` component), with `bundledGrafana: false` here.
 */
export type KubePrometheusStackConfig = ContractConfig<
  typeof Observability_CaaS_KubePrometheusStack,
  'retentionDays'
>;
