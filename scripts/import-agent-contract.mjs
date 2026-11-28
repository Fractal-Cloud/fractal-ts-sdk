/**
 * Imports one agent's published parameter contract from a local file: writes
 * its snapshot, moves its pin in contracts/sources.json, regenerates
 * src/model/offers/generated/ and validates the result as
 * `npm run contracts:generate` does. Offline: nothing is fetched. Each agent's
 * release workflow runs it on the contract it has just released, and opens a
 * pull request with the result; see docs/offer-contracts.md.
 *
 *   node scripts/import-agent-contract.mjs <agentId> <tag> <param-contract.json>
 *       [--repository <owner/name>] [--asset <release asset name>]
 *       [--allow-downgrade]
 *
 * `--repository` and `--asset` are required for an agent the sources do not
 * list yet, and replace the pinned ones otherwise. A tag older than the pinned
 * one imports nothing unless `--allow-downgrade`.
 *
 * Standard output carries only the change summary (Markdown, parameter names
 * only), so a caller can redirect it into a pull request body; it is empty
 * when nothing changed. Progress and errors go to standard error. Exit 0 when
 * the import succeeded or there was nothing to import, 1 when it was refused,
 * 2 on a usage error.
 */
import {readFileSync} from 'node:fs';
import {
  applyImports,
  isChange,
  planImport,
  renderSummary,
} from './offer-contracts/import.mjs';
import {readSources} from './offer-contracts/snapshot.mjs';

const USAGE =
  'usage: node scripts/import-agent-contract.mjs <agentId> <tag> <param-contract.json> ' +
  '[--repository <owner/name>] [--asset <name>] [--allow-downgrade]';

const parseArgs = argv => {
  const positional = [];
  const options = {allowDowngrade: false};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--allow-downgrade') {
      options.allowDowngrade = true;
    } else if (arg === '--repository' || arg === '--asset') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        return null;
      }
      options[arg.slice(2)] = value;
      i++;
    } else if (arg.startsWith('--')) {
      return null;
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 3) {
    return null;
  }
  const [agentId, tag, file] = positional;
  return {agentId, tag, file, ...options};
};

const args = parseArgs(process.argv.slice(2));
if (args === null) {
  console.error(USAGE);
  process.exit(2);
}

const root = process.cwd();
try {
  let text;
  try {
    text = readFileSync(args.file, 'utf8');
  } catch (e) {
    throw new Error(`cannot read ${args.file} (${e.code ?? 'error'})`);
  }
  const sources = readSources(root);
  const plan = planImport({root, sources, text, ...args});
  if (plan.status === 'older') {
    console.error(
      `${args.agentId}: ${args.tag} is older than the pinned ${plan.fromTag}; nothing imported ` +
        '(pass --allow-downgrade to import it anyway)',
    );
  } else if (plan.status === 'unchanged') {
    console.error(
      `${args.agentId}: ${args.tag} publishes the contract the snapshot holds (${plan.fromTag}); nothing imported`,
    );
  } else if (isChange(plan)) {
    await applyImports(root, sources, [plan]);
    console.error(
      `${args.agentId}: imported ${args.tag} (${plan.status}, was ${plan.fromTag ?? 'absent'})`,
    );
    process.stdout.write(
      renderSummary(args.agentId, plan.fromTag, args.tag, plan.summary),
    );
  }
} catch (e) {
  console.error(`import refused: ${e.message}`);
  process.exit(1);
}
