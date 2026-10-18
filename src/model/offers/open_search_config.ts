import type {Storage_CaaS_OpenSearch} from './generated/storage';
import type {ContractConfig} from './contract/contract_config';

/**
 * Vendor knobs of `StorageOpenSearch` (`Storage.CaaS.OpenSearch`), from the
 * parameter contract aria-agent-caas-k8s publishes (v1.8.0 on). Every key is
 * optional and sent only when set.
 */
export type OpenSearchConfig = ContractConfig<typeof Storage_CaaS_OpenSearch>;
