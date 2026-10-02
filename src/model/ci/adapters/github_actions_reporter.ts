/**
 * ci/adapters/github_actions_reporter.ts — ADAPTER: GitHub Actions workflow
 * commands (`::notice::`, `::add-mask::`, …) and the job summary file.
 */
import {appendFileSync} from 'node:fs';
import type {CiEnvironment} from '../ci_environment';
import type {CiReporter} from '../ci_reporter';
import {escapeGitHubData} from './command_escaping';
import {present} from './present';

export const githubActionsReporter = (
  env: CiEnvironment = process.env,
): CiReporter => {
  const command = (name: string, data: string): void => {
    console.log(`::${name}::${escapeGitHubData(data)}`);
  };
  return {
    notice: m => command('notice', m),
    warning: m => command('warning', m),
    error: m => command('error', m),
    mask: secret => {
      if (secret.length > 0) {
        command('add-mask', secret);
      }
    },
    appendSummary: markdown => {
      const path = present(env, 'GITHUB_STEP_SUMMARY');
      if (path !== undefined) {
        appendFileSync(path, `${markdown}\n`);
      }
    },
  };
};
