/**
 * environment/update_agents.ts — update the cloud agents of an environment tree.
 *
 * An UPDATE is not a re-initialization. `POST .../initializer/{provider}/update`
 * appends steps to the agent's existing initialization run — its role and
 * permission assignments, its credential mirror, its compute — and a redeploy
 * on the latest published version, then drives only those. That is how an
 * existing agent receives a permission granted after it was initialized. The
 * request has no body and answers 202; the run is then read back through the
 * same `GET .../initializer/{provider}/status` initialization uses.
 *
 * The control plane offers it for AWS, Azure and GCP agents only.
 */
import superagent from 'superagent';
import {collectSecrets, send} from '../api-error';
import {
  authHeaders,
  elapsedSec,
  log,
  sleep,
  type ApiConfig,
  type LabeledSecret,
} from '../http';
import type {CloudAgent} from './cloud_agents';
import type {CloudAgentTarget} from './cloud_agent_target';
import {
  resolveEnvironment,
  type ManagementEnvironmentNode,
  type ResolvedEnvironment,
} from './environment';
import {
  agentAccountId,
  awsCredsWarning,
  envUri,
  fetchInitializationStatus,
  initHeaders,
  logSteps,
  partialAwsCredentials,
  providerCredentialsFor,
  providerPath,
  stableStringify,
  type InitializationRun,
} from './service';
import {formatEnvironmentId, type ProviderCredentials} from './types';
import type {UpdateEnvironmentAgentsOptions} from './update_environment_agents_options';

const DEFAULT_POLL_INTERVAL_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 55 * 60_000;

/** The providers whose agents the control plane can update. */
const UPDATABLE: ReadonlySet<CloudAgent['provider']> = new Set([
  'AWS',
  'AZURE',
  'GCP',
]);

const updateFailure = (provider: string, run: InitializationRun): string => {
  const lines = (run.steps ?? [])
    .filter(s => s.status === 'Failed')
    .map(
      s =>
        `      - ${s.resourceName ?? '(unknown)'}: ${s.lastOperationStatusMessage ?? 'Failed'}`,
    );
  return `${provider} cloud-agent update failed:\n${lines.join('\n')}`;
};

/** Poll an update to a terminal status, ignoring the run it was started over. */
const awaitUpdate = async (
  env: ResolvedEnvironment,
  agent: CloudAgent,
  cfg: ApiConfig,
  before: string,
  opts: {quiet: boolean; pollIntervalMs: number; timeoutMs: number},
): Promise<void> => {
  const envId = formatEnvironmentId(env.id);
  const provider = agent.provider;
  const startMs = Date.now();
  const deadline = startMs + opts.timeoutMs;
  let round = 0;
  // The status endpoint keeps serving the run as it was until the control plane
  // appends the update's steps, and that run is usually Completed: accepting it
  // would report an update that has not started as done. Every read is judged
  // against the pre-update snapshot until one differs.
  let pickedUp = false;
  while (Date.now() < deadline) {
    round++;
    const run = await fetchInitializationStatus(env, provider, cfg);
    if (run !== null && !pickedUp && stableStringify(run) !== before) {
      pickedUp = true;
    }
    if (run === null || !pickedUp) {
      log(opts.quiet, 'CHECK', 'Waiting for the cloud-agent update to start', {
        env: envId,
        provider,
        round,
        status: run?.status ?? 'Unknown',
        elapsed: elapsedSec(startMs),
      });
      await sleep(opts.pollIntervalMs);
      continue;
    }
    logSteps(opts.quiet, envId, provider, run);
    if (run.status === 'Completed') {
      log(opts.quiet, 'INFO', 'Cloud-agent update completed', {
        env: envId,
        provider,
        elapsed: elapsedSec(startMs),
      });
      return;
    }
    if (run.status === 'Cancelled') {
      log(opts.quiet, 'ERROR', 'Cloud-agent update cancelled', {
        env: envId,
        provider,
        elapsed: elapsedSec(startMs),
      });
      throw new Error(`${provider} cloud-agent update was cancelled.`);
    }
    // A run reads Failed as soon as a step does, but only a Failed step is a
    // verdict: with none yet the drive is still working, so keep polling.
    if (
      run.status === 'Failed' &&
      (run.steps ?? []).some(s => s.status === 'Failed')
    ) {
      log(opts.quiet, 'ERROR', 'Cloud-agent update failed', {
        env: envId,
        provider,
        elapsed: elapsedSec(startMs),
      });
      throw new Error(updateFailure(provider, run));
    }
    log(opts.quiet, 'CHECK', 'Polling cloud-agent update', {
      env: envId,
      provider,
      round,
      status: run.status,
      elapsed: elapsedSec(startMs),
    });
    await sleep(opts.pollIntervalMs);
  }
  log(opts.quiet, 'ERROR', 'Cloud-agent update timed out', {
    env: envId,
    provider,
    elapsed: elapsedSec(startMs),
    timeoutMs: opts.timeoutMs,
  });
  throw new Error(`${provider} cloud-agent update timed out.`);
};

/**
 * Update the cloud agents an environment tree declares (all of them, or those
 * `only` selects): management environment first, then each operational
 * environment, one agent at a time. Writes no environment — deploy the tree
 * first if it changed.
 */
export async function updateEnvironmentAgents(
  management: ManagementEnvironmentNode,
  cfg: ApiConfig,
  opts: UpdateEnvironmentAgentsOptions = {},
): Promise<void> {
  const tree = resolveEnvironment(management);
  const quiet = opts.quiet ?? false;
  const mode = opts.agentUpdate ?? 'fire-and-forget';
  const pollIntervalMs = opts.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const managementEnvId = formatEnvironmentId(tree.management.id);

  const target = (
    env: ResolvedEnvironment,
    agent: CloudAgent,
  ): CloudAgentTarget => ({
    environment: {...env.id},
    tier:
      formatEnvironmentId(env.id) === managementEnvId
        ? 'management'
        : 'operational',
    provider: agent.provider,
    accountId: agentAccountId(agent),
    region: agent.region,
  });

  const selected = [tree.management, ...tree.operationals].flatMap(env =>
    env.cloudAgents
      .filter(agent => (opts.only ? opts.only(target(env, agent)) : true))
      .map(agent => ({env, agent})),
  );

  // Everything that can be refused without the control plane is refused before
  // the first request, so a bad call updates nothing rather than half the tree.
  if (selected.length === 0) {
    throw new Error(
      `No cloud agent to update: the tree of '${managementEnvId}' declares none` +
        (opts.only ? ' that `only` selects.' : '.'),
    );
  }
  const notUpdatable = selected.filter(
    ({agent}) => !UPDATABLE.has(agent.provider),
  );
  if (notUpdatable.length > 0) {
    const names = notUpdatable
      .map(
        ({env, agent}) => `${agent.provider} (${formatEnvironmentId(env.id)})`,
      )
      .join(', ');
    throw new Error(
      `${names} cannot be updated: the control plane updates AWS, Azure and GCP agents only. ` +
        'Leave them out with `only`.',
    );
  }
  const source = opts.providerCredentials;
  const staticCredentials = typeof source === 'function' ? undefined : source;
  if (staticCredentials !== undefined) {
    for (const {env, agent} of selected) {
      const key = agent.provider.toLowerCase() as keyof ProviderCredentials;
      if (!staticCredentials[key]) {
        throw new Error(
          `Cloud-agent update for ${agent.provider} in environment '${formatEnvironmentId(env.id)}' ` +
            `requires providerCredentials.${key} when providerCredentials is given, but none were supplied.`,
        );
      }
    }
    if (selected.some(({agent}) => agent.provider === 'AWS')) {
      const problem = partialAwsCredentials(staticCredentials);
      if (problem !== null) {
        throw new Error(`providerCredentials.aws: ${problem}`);
      }
    }
  }

  // Every credential this call sends, attached to the config so a server quoting
  // one back from ANY later request (a status poll included) is redacted.
  const secrets: LabeledSecret[] = [
    ...collectSecrets(staticCredentials, 'providerCredentials'),
  ];
  const scopedCfg: ApiConfig = {...cfg, extraSecrets: secrets};
  const credentialsFor = providerCredentialsFor(
    source,
    managementEnvId,
    secrets,
    'update',
  );

  for (const {env, agent} of selected) {
    const envId = formatEnvironmentId(env.id);
    const provider = agent.provider;
    const initializerPath = `initializer/${providerPath[provider]}`;

    let before: string | null = null;
    if (mode === 'wait') {
      const current = await fetchInitializationStatus(env, provider, scopedCfg);
      if (current === null) {
        throw new Error(
          `The ${provider} cloud agent of environment '${envId}' has no initialization run to ` +
            'update. Initialize it first (cloud.environments.deploy).',
        );
      }
      before = stableStringify(current);
    }

    let providerHeaders: Record<string, string> = {};
    if (source !== undefined) {
      const credentials = await credentialsFor(env, agent);
      const warning = provider === 'AWS' ? awsCredsWarning(credentials) : null;
      if (warning !== null) {
        log(quiet, 'WARN', warning, {env: envId, provider});
      }
      providerHeaders = initHeaders(agent, credentials, 'update');
    }

    log(quiet, 'INFO', 'Starting cloud-agent update', {env: envId, provider});
    await send(
      scopedCfg,
      superagent
        .post(envUri(scopedCfg, env, `${initializerPath}/update`))
        .ok(r => r.status === 202)
        .set(authHeaders(scopedCfg))
        .set(providerHeaders),
      collectSecrets(providerHeaders),
    );

    if (before !== null) {
      await awaitUpdate(env, agent, scopedCfg, before, {
        quiet,
        pollIntervalMs,
        timeoutMs,
      });
    }
  }
}
