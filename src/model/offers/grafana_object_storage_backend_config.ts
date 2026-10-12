import type {Observability_CaaS_GrafanaLoki} from './generated/observability';
import type {ContractConfig} from './contract/contract_config';

/**
 * Vendor knobs of `GrafanaLoki` (`Observability.CaaS.GrafanaLoki`), and of
 * `GrafanaTempo`, whose caas-k8s contract declares the same keys: the agent's
 * published contract. The retention is the component's own `retentionDays`
 * (`withRetentionDays`), so it is not offered again here. Their data lives in
 * the one S3 bucket they link to with `{access: 'read-write'}`.
 */
export type GrafanaObjectStorageBackendConfig = ContractConfig<
  typeof Observability_CaaS_GrafanaLoki,
  'retentionDays'
>;
