/**
 * Fetches the agents' published parameter contracts into contracts/snapshot/.
 * Needs network, the GitHub CLI with read access to the agent repositories
 * (GH_TOKEN), and, for the Java agents, a JDK 21: see docs/offer-contracts.md.
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

const run = (command, commandArgs, options = {}) =>
  execFileSync(command, commandArgs, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    ...options,
  });

const latestTag = repository =>
  run('gh', [
    'release',
    'view',
    '--repo',
    repository,
    '--json',
    'tagName',
    '--jq',
    '.tagName',
  ]).trim();

/** A Go agent attaches param-contract.json to its GitHub release. */
const fetchReleaseAsset = (agent, tag, work) => {
  run('gh', [
    'release',
    'download',
    tag,
    '--repo',
    agent.repository,
    '--pattern',
    agent.fetch.asset,
    '--dir',
    work,
  ]);
  return readFileSync(join(work, agent.fetch.asset), 'utf8');
};

/**
 * The Java agents publish no downloadable 2.0 projection (docs/offer-contracts.md,
 * "Producer gaps"), so it is built from the release tag with the agents' own
 * generator, stamped with the tag as the release pipeline stamps it.
 */
const builtCheckouts = new Map();
const fetchGradleBuild = (agent, tag, work) => {
  const key = `${agent.repository}@${tag}`;
  let checkout = builtCheckouts.get(key);
  if (checkout === undefined) {
    checkout = join(work, 'checkout');
    run('gh', [
      'repo',
      'clone',
      agent.repository,
      checkout,
      '--',
      '--depth',
      '1',
      '--branch',
      tag,
    ]);
    builtCheckouts.set(key, checkout);
  }
  run('./gradlew', [agent.fetch.task, '--console=plain', '-q'], {
    cwd: checkout,
    env: {...process.env, RELEASE_VERSION: tag},
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  return readFileSync(join(checkout, agent.fetch.output), 'utf8');
};

const FETCHERS = {
  'release-asset': fetchReleaseAsset,
  'gradle-build': fetchGradleBuild,
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
