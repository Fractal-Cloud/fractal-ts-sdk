/**
 * environment/skipped_agent_reason.ts — why a deploy left an agent alone.
 *
 * - `missing-credentials`: the run holds no credentials for the agent's cloud
 *   (its resolver threw {@link ProviderCredentialsNotConfigured}); another job
 *   initializes it.
 * - `pending-management`: an operational agent whose management agent on the
 *   same cloud has not completed, which the control plane would refuse; a later
 *   deploy initializes it.
 */
export type SkippedAgentReason = 'missing-credentials' | 'pending-management';
