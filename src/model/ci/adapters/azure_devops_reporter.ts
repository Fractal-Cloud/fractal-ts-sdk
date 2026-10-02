/**
 * ci/adapters/azure_devops_reporter.ts — ADAPTER: Azure Pipelines logging
 * commands (`##vso[task.logissue]`, `##vso[task.setsecret]`,
 * `##vso[task.uploadsummary]`).
 *
 * Azure Pipelines has no "notice" annotation, so a notice is a plain log line
 * behind a fixed prefix.
 * A summary is uploaded from a markdown file: each one is written to its own
 * file under `AGENT_TEMPDIRECTORY` and attached to the run.
 */
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {CiEnvironment} from '../ci_environment';
import type {CiReporter} from '../ci_reporter';
import {escapeAzureDevOpsData} from './command_escaping';
import {present} from './present';

export const azureDevOpsReporter = (
  env: CiEnvironment = process.env,
): CiReporter => {
  let summaries = 0;
  let summaryDir: string | undefined;
  return {
    // A fixed prefix: a notice starting with `##vso[` must not be read as a command.
    notice: m => console.log(`NOTICE ${escapeAzureDevOpsData(m)}`),
    warning: m =>
      console.log(
        `##vso[task.logissue type=warning]${escapeAzureDevOpsData(m)}`,
      ),
    error: m =>
      console.log(`##vso[task.logissue type=error]${escapeAzureDevOpsData(m)}`),
    mask: secret => {
      if (secret.length > 0) {
        console.log(`##vso[task.setsecret]${escapeAzureDevOpsData(secret)}`);
      }
    },
    appendSummary: markdown => {
      summaryDir ??= mkdtempSync(
        join(
          present(env, 'AGENT_TEMPDIRECTORY') ?? tmpdir(),
          'fractal-summary-',
        ),
      );
      summaries++;
      const path = join(summaryDir, `fractal-cloud-${summaries}.md`);
      writeFileSync(path, `${markdown}\n`);
      console.log(`##vso[task.uploadsummary]${escapeAzureDevOpsData(path)}`);
    },
  };
};
