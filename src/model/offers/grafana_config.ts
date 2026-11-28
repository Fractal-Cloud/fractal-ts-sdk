import type {Observability_CaaS_Grafana} from './generated/observability';
import type {ContractConfig} from './contract/contract_config';
import type {SecretRef} from '../secret';

/**
 * Vendor knobs of the `Grafana` offer (`Observability.CaaS.Grafana`): the
 * caas-k8s agent's published contract.
 *
 * `dashboards` and `datasources` are typed as the contract publishes them
 * (objects); their shapes and limits are the agent's checks until the contract
 * carries them.
 */
export type GrafanaConfig = ContractConfig<
  typeof Observability_CaaS_Grafana,
  never,
  {
    /**
     * The Google OAuth client secret, as a reference to an environment secret:
     * `{GF_AUTH_GOOGLE_CLIENT_SECRET: secretRef('grafana-google')}`. Grafana
     * reads no other variable from secrets. Select the secret with
     * `withEnvironmentSecrets`. The contract types it only as `object`, so the
     * offer refuses any value that is not a reference.
     */
    secretEnv?: Readonly<{GF_AUTH_GOOGLE_CLIENT_SECRET: SecretRef}>;
  }
>;
