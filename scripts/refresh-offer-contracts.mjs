/**
 * Fetches the agents' published parameter contracts into contracts/snapshot/.
 * Needs network and the GitHub CLI with read access to the agent repositories
 * (GH_TOKEN): see docs/offer-contracts.md.
 *
 *   node scripts/refresh-offer-contracts.mjs            re-fetch the pinned tags
 *   node scripts/refresh-offer-contracts.mjs --latest   move every pin to its latest release
 *   node scripts/refresh-offer-contracts.mjs --latest --check
 *                                                       write nothing; exit 1 when the
 *                                                       snapshot is behind a release
 *
 * After writing, run `npm run contracts:generate`.
 */
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {canonicalJson, sha256} from './offer-contracts/generator.mjs';
import {
  SOURCES_FILE,
  readSources,
  snapshotFile,
} from './offer-contracts/snapshot.mjs';

const args = new Set(process.argv.slice(2));
const latest = args.has('--latest');
const check = args.has('--check');
const root = process.cwd();

/**
 * Runs a command with its output captured. The agent repositories are private,
 * so their tools' output is never echoed (it would reach public CI logs): a
 * failure is reported as the step that failed and its exit code only.
 */
const run = (command, commandArgs, step) => {
  try {
    return execFileSync(command, commandArgs, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    throw new Error(`${step} failed (exit ${e.status ?? 'unknown'})`);
  }
};

const latestTag = repository =>
  run(
    'gh',
    [
      'release',
      'view',
      '--repo',
      repository,
      '--json',
      'tagName',
      '--jq',
      '.tagName',
    ],
    `reading the latest release of ${repository}`,
  ).trim();

/** Every agent attaches its parameter contract to its GitHub release. */
const fetchReleaseAsset = (agent, tag, work) => {
  run(
    'gh',
    [
      'release',
      'download',
      tag,
      '--repo',
      agent.repository,
      '--pattern',
      agent.fetch.asset,
      '--dir',
      work,
    ],
    `downloading ${agent.fetch.asset} of ${agent.agentId} ${tag}`,
  );
  return readFileSync(join(work, agent.fetch.asset), 'utf8');
};

const FETCHERS = {
  'release-asset': fetchReleaseAsset,
};

const sources = readSources(root);
const stale = [];
const work = mkdtempSync(join(tmpdir(), 'offer-contracts-'));
try {
  for (const agent of sources.agents) {
    const tag = latest ? latestTag(agent.repository) : agent.tag;
    const fetcher = FETCHERS[agent.fetch.kind];
    if (fetcher === undefined) {
      throw new Error(
        `${agent.agentId}: unknown fetch kind '${agent.fetch.kind}'`,
      );
    }
    const agentWork = mkdtempSync(join(work, 'agent-'));
    const projection = JSON.parse(fetcher(agent, tag, agentWork));
    if (
      projection.agentId !== agent.agentId ||
      projection.agentVersion !== tag
    ) {
      throw new Error(
        `${agent.repository}@${tag} published ${projection.agentId}@${projection.agentVersion}, ` +
          `expected ${agent.agentId}@${tag}`,
      );
    }
    const text = canonicalJson(projection);
    const digest = sha256(text);
    if (tag === agent.tag && digest === agent.snapshotSha256) {
      console.log(`${agent.agentId}: ${tag} is current`);
      continue;
    }
    stale.push(`${agent.agentId}: snapshot ${agent.tag}, published ${tag}`);
    if (!check) {
      writeFileSync(join(root, snapshotFile(agent.agentId)), text);
      agent.tag = tag;
      agent.snapshotSha256 = digest;
      console.log(`${agent.agentId}: wrote ${tag}`);
    }
  }
} finally {
  rmSync(work, {recursive: true, force: true});
}

if (check) {
  if (stale.length > 0) {
    console.error(
      `The offer contract snapshot is stale:\n  ${stale.join('\n  ')}\n` +
        'Run `node scripts/refresh-offer-contracts.mjs --latest && npm run contracts:generate`, ' +
        'review the generated diff and release notes (docs/offer-contracts.md), and open a PR.',
    );
    process.exit(1);
  }
  console.log('The offer contract snapshot is current.');
} else {
  writeFileSync(
    join(root, SOURCES_FILE),
    `${JSON.stringify(sources, null, 2)}\n`,
  );
}
