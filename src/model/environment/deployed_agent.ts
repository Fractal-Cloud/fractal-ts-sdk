/** environment/deployed_agent.ts — one cloud agent of one environment, as a
 *  deploy reports it. */
import type {EnvironmentId, ProviderType} from './types';

export type DeployedAgent = {
  environment: EnvironmentId;
  provider: ProviderType;
};
