import type {Security_CaaS_CertManager} from './generated/security';
import type {ContractConfig} from './contract/contract_config';

/**
 * Vendor knobs of the `CertManager` offer (`Security.CaaS.CertManager`): the
 * caas-k8s agent's published contract. The cert-manager chart version is
 * pinned by the agent and is not a parameter.
 */
export type CertManagerConfig = ContractConfig<
  typeof Security_CaaS_CertManager,
  never,
  {
    /**
     * `production` (the agent default), `staging` (Let's Encrypt's directories) or
     * an `https://` ACME directory URL.
     */
    acmeServer?: 'production' | 'staging' | `https://${string}`;
  }
>;
