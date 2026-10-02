/** environment/environment_update_result.ts — what `environments.updateAgents`
 *  did with each selected cloud agent. */
import type {DeployedAgent} from './deployed_agent';
import type {SkippedAgent} from './skipped_agent';

export type EnvironmentUpdateResult = {
  /** Agents whose update this call started (and, under `wait`, saw complete). */
  started: DeployedAgent[];
  /** Agents left alone because this run holds no credentials for their cloud. */
  skipped: SkippedAgent[];
};
