/**
 * Importing one agent's published parameter contract into the committed
 * snapshot: validating it, deciding whether it changes anything, summarizing
 * what it changes, and writing the snapshot, `contracts/sources.json` and the
 * generated modules. Offline: the document is handed in, never fetched.
 *
 * Used by `scripts/import-agent-contract.mjs` (one local file, run by each
 * agent's release workflow) and `scripts/refresh-offer-contracts.mjs` (fetches
 * the documents first). See docs/offer-contracts.md.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {canonicalJson, sha256} from './generator.mjs';
import {
  SOURCES_FILE,
  generateFromProjections,
  readSnapshot,
  snapshotFile,
  writeGenerated,
} from './snapshot.mjs';

const TAG_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

/**
 * Orders two release tags (`vX.Y.Z`, optionally `-pre`): negative when `a` is
 * older. `null` when either is not such a tag, so nothing is ordered on a guess.
 */
export const compareTags = (a, b) => {
  const pa = TAG_PATTERN.exec(a);
  const pb = TAG_PATTERN.exec(b);
  if (pa === null || pb === null) {
    return null;
  }
  for (let i = 1; i <= 3; i++) {
    const delta = Number(pa[i]) - Number(pb[i]);
    if (delta !== 0) {
      return delta;
    }
  }
  if (pa[4] === pb[4]) {
    return 0;
  }
  if (pa[4] === undefined) {
    return 1;
  }
  if (pb[4] === undefined) {
    return -1;
  }
  return pa[4] < pb[4] ? -1 : 1;
};

/** The contract without the release it came from: what "unchanged" compares. */
const contractBody = projection => {
  const rest = {...projection};
  delete rest.agentVersion;
  return canonicalJson(rest);
};

const same = (a, b) => canonicalJson(a ?? null) === canonicalJson(b ?? null);

const byKey = (items, key) =>
  new Map((items ?? []).map(item => [item[key], item]));

/** Members of `a` and `b` (objects) whose values differ, except `ignored`. */
const changedMembers = (a, b, ignored) =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter(member => !ignored.includes(member))
    .filter(member => !same(a[member], b[member]))
    .sort();

/** Constraint members that set a lower bound; a higher one refuses more values. */
const LOWER_BOUNDS = ['minimum', 'minLength', 'minItems'];
/** Constraint members that set an upper bound; a lower one refuses more values. */
const UPPER_BOUNDS = ['maximum', 'maxLength', 'maxItems'];

/** Constraints that are checked, or none: a `level: warn` constraint refuses nothing. */
const enforced = constraints =>
  constraints !== undefined &&
  constraints !== null &&
  constraints.level !== 'warn'
    ? constraints
    : {};

/**
 * How a parameter's own constraints refuse values the previous ones accepted:
 * a bound added or moved inward, a pattern added or changed (a changed pattern
 * is not compared, so it counts as tightened), or a `warn` constraint made an
 * error. `null` when they refuse nothing new. The constraints of nested
 * `properties` and `items` are not compared.
 */
export const tightenedConstraints = (before, after) => {
  const was = enforced(before);
  const now = enforced(after);
  const reasons = [];
  for (const member of LOWER_BOUNDS) {
    if (
      typeof now[member] === 'number' &&
      !(typeof was[member] === 'number' && now[member] <= was[member])
    ) {
      reasons.push(`${member} ${was[member] ?? 'none'} -> ${now[member]}`);
    }
  }
  for (const member of UPPER_BOUNDS) {
    if (
      typeof now[member] === 'number' &&
      !(typeof was[member] === 'number' && now[member] >= was[member])
    ) {
      reasons.push(`${member} ${was[member] ?? 'none'} -> ${now[member]}`);
    }
  }
  if (typeof now.pattern === 'string' && now.pattern !== was.pattern) {
    reasons.push(
      was.pattern === undefined ? 'pattern added' : 'pattern changed',
    );
  }
  return reasons.length === 0
    ? null
    : `constraints tightened: ${reasons.join(', ')}`;
};

/**
 * Why a parameter change can break consumers (section 5 of the docs): code that
 * stops compiling, or a value that a Live System build now refuses.
 */
const breakingParameterChange = (before, after) => {
  if (before.required !== true && after.required === true) {
    return 'became required';
  }
  if (!same(before.type, after.type)) {
    return `type ${before.type} -> ${after.type}`;
  }
  if (Array.isArray(after.values)) {
    const allowed = new Set(after.values);
    if (!Array.isArray(before.values)) {
      return 'allowed values introduced';
    }
    const dropped = before.values.filter(v => !allowed.has(v));
    if (dropped.length > 0) {
      return `allowed values dropped: ${dropped.join(', ')}`;
    }
  }
  return tightenedConstraints(before.constraints, after.constraints);
};

/**
 * What `next` changes against `previous` (both projections; `previous` null
 * for an agent the snapshot does not hold yet), offer by offer and key by key.
 * Only names are reported, never values.
 */
export const summarizeChanges = (previous, next) => {
  const before = byKey(previous?.offers, 'offerType');
  const after = byKey(next.offers, 'offerType');
  const summary = {
    offersAdded: [],
    offersRemoved: [],
    offersChanged: [],
    breaking: [],
  };
  for (const offerType of [...after.keys()].sort()) {
    if (!before.has(offerType)) {
      summary.offersAdded.push(offerType);
    }
  }
  for (const offerType of [...before.keys()].sort()) {
    if (!after.has(offerType)) {
      summary.offersRemoved.push(offerType);
      summary.breaking.push(`${offerType}: offer removed`);
    }
  }
  for (const offerType of [...after.keys()].sort()) {
    const was = before.get(offerType);
    if (was === undefined) {
      continue;
    }
    const now = after.get(offerType);
    const wasParams = byKey(was.params, 'key');
    const nowParams = byKey(now.params, 'key');
    const aliased = new Set(
      (now.params ?? []).flatMap(param => param.aliases ?? []),
    );
    const change = {
      offerType,
      keysAdded: [],
      keysRemoved: [],
      keysChanged: [],
      offerMembers: changedMembers(was, now, ['params', 'offerType']),
    };
    for (const key of [...nowParams.keys()].sort()) {
      if (!wasParams.has(key)) {
        change.keysAdded.push(key);
        if (nowParams.get(key).required === true) {
          summary.breaking.push(`${offerType}.${key}: added as required`);
        }
      }
    }
    for (const key of [...wasParams.keys()].sort()) {
      if (!nowParams.has(key)) {
        change.keysRemoved.push(key);
        if (!aliased.has(key)) {
          summary.breaking.push(
            `${offerType}.${key}: removed without an alias`,
          );
        }
      }
    }
    for (const key of [...nowParams.keys()].sort()) {
      const wasParam = wasParams.get(key);
      if (wasParam === undefined) {
        continue;
      }
      const nowParam = nowParams.get(key);
      const members = changedMembers(wasParam, nowParam, ['key']);
      if (members.length > 0) {
        change.keysChanged.push({key, members});
        const reason = breakingParameterChange(wasParam, nowParam);
        if (reason !== null) {
          summary.breaking.push(`${offerType}.${key}: ${reason}`);
        }
      }
    }
    if (was.canAccessSecrets === true && now.canAccessSecrets !== true) {
      summary.breaking.push(`${offerType}: canAccessSecrets dropped`);
    }
    if (
      change.keysAdded.length > 0 ||
      change.keysRemoved.length > 0 ||
      change.keysChanged.length > 0 ||
      change.offerMembers.length > 0
    ) {
      summary.offersChanged.push(change);
    }
  }
  return summary;
};

const codeList = names => names.map(name => `\`${name}\``).join(', ');

/** The summary as Markdown, for a pull request body. */
export const renderSummary = (agentId, fromTag, toTag, summary) => {
  const lines = [
    `### ${agentId} ${fromTag === null ? 'new' : fromTag} -> ${toTag}`,
    '',
  ];
  if (summary.breaking.length > 0) {
    lines.push(
      '**Possibly breaking for SDK consumers** (see docs/offer-contracts.md, section 5):',
      '',
    );
    for (const item of summary.breaking) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }
  if (summary.offersAdded.length > 0) {
    lines.push(`- Offers added: ${codeList(summary.offersAdded)}`);
  }
  if (summary.offersRemoved.length > 0) {
    lines.push(`- Offers removed: ${codeList(summary.offersRemoved)}`);
  }
  for (const change of summary.offersChanged) {
    lines.push(`- \`${change.offerType}\``);
    if (change.keysAdded.length > 0) {
      lines.push(`  - added: ${codeList(change.keysAdded)}`);
    }
    if (change.keysRemoved.length > 0) {
      lines.push(`  - removed: ${codeList(change.keysRemoved)}`);
    }
    if (change.keysChanged.length > 0) {
      lines.push(
        `  - changed: ${change.keysChanged
          .map(({key, members}) => `\`${key}\` (${members.join(', ')})`)
          .join(', ')}`,
      );
    }
    if (change.offerMembers.length > 0) {
      lines.push(`  - offer: ${change.offerMembers.join(', ')}`);
    }
  }
  if (
    summary.offersAdded.length === 0 &&
    summary.offersRemoved.length === 0 &&
    summary.offersChanged.length === 0
  ) {
    lines.push('- No offer or key changed.');
  }
  return `${lines.join('\n')}\n`;
};

/**
 * Decides what importing `text` (an agent's `param-contract.json`) as
 * `agentId` at `tag` would do, without writing anything.
 *
 * - `unchanged`: the snapshot already holds this contract (apart from the
 *   release it names); the pin stays where it is.
 * - `older`: `tag` is older than the pinned release; nothing is imported
 *   unless `allowDowngrade`.
 * - `changed` / `added`: the snapshot moves to `tag`.
 *
 * Throws when the document is not this agent's contract for this release.
 */
export const planImport = ({
  root,
  sources,
  agentId,
  tag,
  text,
  repository,
  asset,
  allowDowngrade = false,
}) => {
  let projection;
  try {
    projection = JSON.parse(text);
  } catch {
    throw new Error(`${agentId} ${tag}: the contract is not JSON`);
  }
  if (projection === null || typeof projection !== 'object') {
    throw new Error(`${agentId} ${tag}: the contract is not a JSON object`);
  }
  if (projection.agentId !== agentId || projection.agentVersion !== tag) {
    throw new Error(
      `the contract is ${projection.agentId}@${projection.agentVersion}, expected ${agentId}@${tag}`,
    );
  }
  const current = sources.agents.find(agent => agent.agentId === agentId);
  if (
    current === undefined &&
    (repository === undefined || asset === undefined)
  ) {
    throw new Error(
      `${agentId} is not in ${SOURCES_FILE}: pass --repository and --asset to add it`,
    );
  }
  const canonical = canonicalJson(projection);
  const entry = {
    agentId,
    repository: repository ?? current.repository,
    tag,
    fetch: {kind: 'release-asset', asset: asset ?? current.fetch.asset},
    snapshotSha256: sha256(canonical),
  };
  // The generator keeps the order of an object's members, so it is given the
  // document as the snapshot will hold it (keys sorted), not as published:
  // otherwise the modules written now would differ from the ones the snapshot
  // regenerates.
  const plan = {
    agentId,
    tag,
    projection: JSON.parse(canonical),
    canonical,
    entry,
  };
  if (current === undefined) {
    return {
      ...plan,
      status: 'added',
      fromTag: null,
      summary: summarizeChanges(null, projection),
    };
  }
  const previous = JSON.parse(
    readFileSync(join(root, snapshotFile(agentId)), 'utf8'),
  );
  const sameSource =
    entry.repository === current.repository &&
    entry.fetch.asset === current.fetch?.asset;
  const order = compareTags(tag, current.tag);
  if (order !== null && order < 0 && !allowDowngrade) {
    return {...plan, status: 'older', fromTag: current.tag};
  }
  if (
    sameSource &&
    (tag === current.tag
      ? entry.snapshotSha256 === current.snapshotSha256
      : contractBody(projection) === contractBody(previous))
  ) {
    return {...plan, status: 'unchanged', fromTag: current.tag};
  }
  return {
    ...plan,
    status: 'changed',
    fromTag: current.tag,
    summary: summarizeChanges(previous, projection),
  };
};

/** Whether a plan writes anything. */
export const isChange = plan =>
  plan.status === 'changed' || plan.status === 'added';

/**
 * Writes the plans that change something: their snapshots, the updated
 * `contracts/sources.json` and the regenerated modules. Everything is
 * generated (and so validated, as `npm run contracts:generate` does) before
 * the first file is written, so a refused contract leaves the tree as it was.
 */
export const applyImports = async (root, sources, plans) => {
  const changes = plans.filter(isChange);
  if (changes.length === 0) {
    return;
  }
  const committed = new Map(
    readSnapshot(root).map(projection => [projection.agentId, projection]),
  );
  const agents = sources.agents.map(agent => {
    const plan = changes.find(p => p.agentId === agent.agentId);
    return plan === undefined ? agent : plan.entry;
  });
  for (const plan of changes) {
    if (!agents.some(agent => agent.agentId === plan.agentId)) {
      agents.push(plan.entry);
    }
  }
  const projections = agents.map(agent => {
    const plan = changes.find(p => p.agentId === agent.agentId);
    return plan === undefined ? committed.get(agent.agentId) : plan.projection;
  });
  const files = await generateFromProjections(root, projections);
  for (const plan of changes) {
    writeFileSync(join(root, snapshotFile(plan.agentId)), plan.canonical);
  }
  writeFileSync(
    join(root, SOURCES_FILE),
    `${JSON.stringify({...sources, agents}, null, 2)}\n`,
  );
  writeGenerated(root, files);
};
