import type {CiReporter} from '../ci/ci_reporter';
import type {CloudAgentTarget} from './cloud_agent_target';
import type {ProviderCredentials, ProviderCredentialsResolver} from './types';

/** Options of `cloud.environments.updateAgents(...)`. */
export type UpdateEnvironmentAgentsOptions = {
  /**
   * Which of the tree's cloud agents to update. Asked once per agent, in
   * order (the management env's agents first, then each operational env's).
   * Default: every agent the tree declares.
   */
  only?: (agent: CloudAgentTarget) => boolean;
  /**
   * Credentials sent with each update, as the same provider headers
   * `initialize` carries — an object for every agent, or a resolver asked per
   * agent right before its update request (and only for selected agents).
   * Optional, and so is each provider in it: an agent whose provider gets no
   * credentials (absent from the object, or a resolver returning none for it)
   * is updated without provider headers, with the credentials the control
   * plane already holds for the environment. A partial AWS set and mixed
   * static/federated credentials are refused as for `initialize`.
   *
   * A resolver that throws `ProviderCredentialsNotConfigured` (as
   * `credentialsFromCi` does for every cloud but the job's own) skips that agent
   * with a notice: in one job per cloud, each job updates its own cloud's agents.
   *
   * The headers are those `initialize` sends, AWS web identity
   * (`X-AWS-Role-Arn` / `X-AWS-Web-Identity-Token`) included. A control plane
   * that does not read them yet re-runs the steps with the credentials it holds
   * from an earlier `authenticate` / `initialize`; an environment initialized
   * with short-lived inline credentials no longer has those, and its update
   * fails at the first step that needs them — surfaced under
   * `agentUpdate: 'wait'` with the step's message.
   */
  providerCredentials?: ProviderCredentials | ProviderCredentialsResolver;
  /**
   * `wait` polls each update to completion before starting the next;
   * `fire-and-forget` starts them and returns. Default `fire-and-forget`.
   */
  agentUpdate?: 'wait' | 'fire-and-forget';
  /** Where notices about skipped agents go (e.g. `ci.reporter`). Default: the
   *  log lines. */
  reporter?: CiReporter;
  /** Suppress the wait-mode log lines. */
  quiet?: boolean;
  /** Delay between status reads under `wait`. Default 30 seconds. */
  pollIntervalMs?: number;
  /** How long to wait for EACH agent's update under `wait`, not for the whole
   *  call. Default 55 minutes. */
  timeoutMs?: number;
};
