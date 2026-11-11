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
  'retentionDays',
  {
    /**
     * Grafana's environment variables resolved from environment secrets, by
     * variable name: `{GF_AUTH_GOOGLE_CLIENT_SECRET: secretRef('grafana-google')}`
     * (caas-k8s v1.17.0). Only references travel; select each secret with
     * `withEnvironmentSecrets`. The contract types it only as `object`, so the
     * offer refuses any value that is not a reference.
     */
    secretEnv?: Readonly<Record<string, SecretRef>>;
  }
>;
