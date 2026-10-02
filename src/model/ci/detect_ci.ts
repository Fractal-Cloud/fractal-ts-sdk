/**
 * ci/detect_ci.ts — pick the CI adapters from the environment the process runs
 * in: GitHub Actions (`GITHUB_ACTIONS=true`), Azure Pipelines (`TF_BUILD=True`),
 * or the local fallback (console reporter, no identity).
 */
import type {Ci} from './ci';
import type {CiEnvironment} from './ci_environment';
import type {DetectCiOptions} from './detect_ci_options';
import {azureDevOpsIdentity} from './adapters/azure_devops_identity';
import {azureDevOpsReporter} from './adapters/azure_devops_reporter';
import {consoleReporter} from './adapters/console_reporter';
import {githubActionsIdentity} from './adapters/github_actions_identity';
import {githubActionsReporter} from './adapters/github_actions_reporter';
import {noCiIdentity} from './adapters/no_ci_identity';
import {present} from './adapters/present';

export const detectCi = (
  env: CiEnvironment = process.env,
  options: DetectCiOptions = {},
): Ci => {
  const fetchFn = options.fetch ?? fetch;
  const variable = (name: string): string | undefined => present(env, name);
  if (env.GITHUB_ACTIONS === 'true') {
    return {
      name: 'github-actions',
      identity: githubActionsIdentity(env, fetchFn),
      reporter: githubActionsReporter(env),
      variable,
    };
  }
  if (env.TF_BUILD?.toLowerCase() === 'true') {
    return {
      name: 'azure-devops',
      identity: azureDevOpsIdentity(env, options.azureDevOps, fetchFn),
      reporter: azureDevOpsReporter(env),
      variable,
    };
  }
  return {
    name: 'local',
    identity: noCiIdentity(),
    reporter: consoleReporter(),
    variable,
  };
};
