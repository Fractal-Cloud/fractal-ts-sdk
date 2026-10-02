/** environment/environment_deploy_result.ts — what `environments.deploy` did
 *  with each cloud agent of the tree. */
import type {DeployedAgent} from './deployed_agent';
import type {SkippedAgent} from './skipped_agent';

export type EnvironmentDeployResult = {
  /** Agents whose initialization this deploy started (and, under `wait`, saw complete). */
  started: DeployedAgent[];
  /** Agents already initialized, left as they are. */
  completed: DeployedAgent[];
  /** Agents with an initialization already running, left to finish. */
  inProgress: DeployedAgent[];
  /** Agents this deploy did not initialize, with the notice it reported. */
  skipped: SkippedAgent[];
};
