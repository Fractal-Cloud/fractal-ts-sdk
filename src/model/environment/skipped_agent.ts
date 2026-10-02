/** environment/skipped_agent.ts — an agent a deploy did not initialize, and why. */
import type {DeployedAgent} from './deployed_agent';
import type {SkippedAgentReason} from './skipped_agent_reason';

export type SkippedAgent = DeployedAgent & {
  reason: SkippedAgentReason;
  /** The notice the deploy reported for it. */
  message: string;
};
