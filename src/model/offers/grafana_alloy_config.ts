import type {Observability_CaaS_GrafanaAlloy} from './generated/observability';
import type {ContractConfig} from './contract/contract_config';

/** Vendor knobs of `GrafanaAlloy` (`Observability.CaaS.GrafanaAlloy`): the caas-k8s agent's published contract. */
export type GrafanaAlloyConfig = ContractConfig<
  typeof Observability_CaaS_GrafanaAlloy
>;
