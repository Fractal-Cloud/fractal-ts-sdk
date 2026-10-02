import type {EnvironmentId, ProviderType} from './types';

/**
 * One cloud agent of an environment tree, as `updateAgents({only})` is asked
 * about it: the same context a {@link ProviderCredentialsResolver} receives.
 */
export type CloudAgentTarget = {
  /** The environment the agent belongs to. */
  environment: EnvironmentId;
  /** `management` for the management env itself, `operational` otherwise. */
  tier: 'management' | 'operational';
  /** The agent's provider. */
  provider: ProviderType;
  /** The cloud account the agent runs in (AWS account id, Azure subscription
   *  id, GCP/Hetzner project id, OCI compartment id). */
  accountId: string;
  /** The agent's region. */
  region: string;
};
