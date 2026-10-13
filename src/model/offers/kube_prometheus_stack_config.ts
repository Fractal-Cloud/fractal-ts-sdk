import type {Observability_CaaS_KubePrometheusStack} from './generated/observability';
import type {ContractConfig} from './contract/contract_config';

/**
 * Vendor knobs of the `KubePrometheusStack` offer
 * (`Observability.CaaS.KubePrometheusStack`): the caas-k8s agent's published
 * contract. The retention is the `Monitoring` component's own `retentionDays`
 * (`withRetentionDays`), so it is not offered again here.
 */
export type KubePrometheusStackConfig = ContractConfig<
  typeof Observability_CaaS_KubePrometheusStack,
  'retentionDays'
>;
