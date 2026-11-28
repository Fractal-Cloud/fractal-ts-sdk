import type {Observability_CaaS_KubePrometheusStack} from './generated/observability';
import type {ContractConfig} from './contract/contract_config';
import type {SecretRef} from '../secret';

/**
 * Vendor knobs of the `KubePrometheusStack` offer
 * (`Observability.CaaS.KubePrometheusStack`): the caas-k8s agent's published
 * contract. The retention is the `Monitoring` component's own `retentionDays`
 * (`withRetentionDays`), so it is not offered again here.
 */
export type KubePrometheusStackConfig = ContractConfig<
  typeof Observability_CaaS_KubePrometheusStack,
  'retentionDays'
> & {
  /**
   * @deprecated aria-agent-caas-k8s v2.0.0 no longer reads Grafana environment
   * secrets: the stack's contract dropped `secretEnv`. Setting it is refused
   * when the offer is built.
   */
  secretEnv?: Readonly<Record<string, SecretRef>>;
  /**
   * @deprecated aria-agent-caas-k8s v2.0.0 gives the stack no environment
   * secrets. Setting it is refused when the offer is built.
   */
  environmentSecretShortNames?: readonly unknown[];
};
