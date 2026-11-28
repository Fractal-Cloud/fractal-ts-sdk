/**
 * Importing an agent's published contract from a local file
 * (scripts/offer-contracts/import.mjs, run by scripts/import-agent-contract.mjs
 * in each agent's release workflow): validation, the "nothing changed" rule, the
 * change summary a pull request carries, and the writes.
 */
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {
  canonicalJson,
  sha256,
} from '../../../../scripts/offer-contracts/generator.mjs';
import {
  applyImports,
  compareTags,
  planImport,
  renderSummary,
  summarizeChanges,
} from '../../../../scripts/offer-contracts/import.mjs';
import {generateFromSnapshot} from '../../../../scripts/offer-contracts/snapshot.mjs';

const AGENT = 'aria-agent-caas-k8s';

const contract = (agentVersion: string, params: object[]) => ({
  schemaVersion: '2.0',
  agentId: AGENT,
  agentVersion,
  offers: [
    {
      offerType: 'Messaging.CaaS.Kafka',
      provider: 'CaaS',
      serviceTypes: ['Messaging.CaaS.Kafka'],
      params,
    },
  ],
});

const V1_PARAMS = [
  {key: 'namespace', type: 'string', default: 'kafka'},
  {key: 'replicas', type: 'integer', default: 1},
  {key: 'tier', type: 'string', values: ['small', 'large']},
  {key: 'legacyName', type: 'string'},
];

describe('compareTags', () => {
  it('orders release tags and refuses to guess on anything else', () => {
    expect(compareTags('v1.2.3', 'v1.10.0')).toBeLessThan(0);
    expect(compareTags('v2.0.0', 'v1.99.99')).toBeGreaterThan(0);
    expect(compareTags('v1.0.0', 'v1.0.0')).toBe(0);
    expect(compareTags('v1.0.0-rc.1', 'v1.0.0')).toBeLessThan(0);
    expect(compareTags('latest', 'v1.0.0')).toBeNull();
  });
});

describe('summarizeChanges', () => {
  it('names added, removed and changed keys, and what may break consumers', () => {
    const next = contract('v2', [
      {key: 'namespace', type: 'string', default: 'kafka', required: true},
      {key: 'replicas', type: 'string', default: '1'},
      {key: 'tier', type: 'string', values: ['small']},
      {key: 'name', type: 'string', aliases: ['legacyName']},
      {key: 'zone', type: 'string', required: true},
    ]);
    const summary = summarizeChanges(contract('v1', V1_PARAMS), next);
    expect(summary.offersAdded).toEqual([]);
    expect(summary.offersRemoved).toEqual([]);
    expect(summary.offersChanged).toEqual([
      {
        offerType: 'Messaging.CaaS.Kafka',
        keysAdded: ['name', 'zone'],
        keysRemoved: ['legacyName'],
        keysChanged: [
          {key: 'namespace', members: ['required']},
          {key: 'replicas', members: ['default', 'type']},
          {key: 'tier', members: ['values']},
        ],
        offerMembers: [],
      },
    ]);
    expect(summary.breaking).toEqual([
      'Messaging.CaaS.Kafka.zone: added as required',
      'Messaging.CaaS.Kafka.namespace: became required',
      'Messaging.CaaS.Kafka.replicas: type integer -> string',
      'Messaging.CaaS.Kafka.tier: allowed values dropped: large',
    ]);
  });

  it('reports a removed offer, and a removed key without an alias, as breaking', () => {
    const previous = contract('v1', V1_PARAMS);
    const withoutKey = contract('v2', V1_PARAMS.slice(0, 3));
    expect(summarizeChanges(previous, withoutKey).breaking).toEqual([
      'Messaging.CaaS.Kafka.legacyName: removed without an alias',
    ]);
    const withoutOffer = {...previous, agentVersion: 'v2', offers: []};
    const summary = summarizeChanges(previous, withoutOffer);
    expect(summary.offersRemoved).toEqual(['Messaging.CaaS.Kafka']);
    expect(summary.breaking).toEqual(['Messaging.CaaS.Kafka: offer removed']);
  });

  it('renders names only, never values', () => {
    const next = contract('v2', [
      ...V1_PARAMS.slice(0, 3),
      {key: 'legacyName', type: 'string', default: 'do-not-print'},
    ]);
    const text = renderSummary(
      AGENT,
      'v1',
      'v2',
      summarizeChanges(contract('v1', V1_PARAMS), next),
    );
    expect(text).toBe(
      '### aria-agent-caas-k8s v1 -> v2\n\n' +
        '- `Messaging.CaaS.Kafka`\n' +
        '  - changed: `legacyName` (default)\n',
    );
    expect(text).not.toContain('do-not-print');
  });
});

describe('planImport and applyImports', () => {
  let root: string;
  let sources: {agents: object[]};

  const write = (path: string, text: string) => {
    mkdirSync(join(root, path, '..'), {recursive: true});
    writeFileSync(join(root, path), text);
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'import-contract-'));
    const text = canonicalJson(contract('v1.0.0', V1_PARAMS));
    write(`contracts/snapshot/${AGENT}.json`, text);
    write('contracts/key-aliases.json', '{"aliases": []}\n');
    mkdirSync(join(root, 'src/model/offers/generated'), {recursive: true});
    sources = {
      agents: [
        {
          agentId: AGENT,
          repository: 'Fractal-Cloud/aria-agent-caas-k8s',
          tag: 'v1.0.0',
          fetch: {kind: 'release-asset', asset: 'param-contract.json'},
          snapshotSha256: sha256(text),
        },
      ],
    };
    write('contracts/sources.json', `${JSON.stringify(sources, null, 2)}\n`);
  });

  afterEach(() => {
    rmSync(root, {recursive: true, force: true});
  });

  const plan = (tag: string, document: object, extra = {}) =>
    planImport({
      root,
      sources,
      agentId: AGENT,
      tag,
      text: JSON.stringify(document),
      ...extra,
    });

  it('imports nothing when a new release publishes the same contract', () => {
    expect(plan('v1.1.0', contract('v1.1.0', V1_PARAMS)).status).toBe(
      'unchanged',
    );
  });

  it('imports nothing from a release older than the pin, unless asked to', () => {
    const older = contract('v0.9.0', V1_PARAMS.slice(0, 2));
    expect(plan('v0.9.0', older).status).toBe('older');
    expect(plan('v0.9.0', older, {allowDowngrade: true}).status).toBe(
      'changed',
    );
  });

  it('refuses a document that is not this agent at this release', () => {
    expect(() => plan('v1.2.0', contract('v1.1.0', V1_PARAMS))).toThrow(
      'expected aria-agent-caas-k8s@v1.2.0',
    );
    expect(() =>
      planImport({root, sources, agentId: AGENT, tag: 'v1', text: '{'}),
    ).toThrow('not JSON');
  });

  it('needs a repository and an asset for an agent the sources do not list', () => {
    const other = {...contract('v0.1.0', V1_PARAMS), agentId: 'aria-agent-x'};
    const args = {
      root,
      sources,
      agentId: 'aria-agent-x',
      tag: 'v0.1.0',
      text: JSON.stringify(other),
    };
    expect(() => planImport(args)).toThrow('pass --repository and --asset');
    expect(
      planImport({
        ...args,
        repository: 'Fractal-Cloud/aria-agent-x',
        asset: 'param-contract.json',
      }).status,
    ).toBe('added');
  });

  it('writes the snapshot, the pin and the generated modules', async () => {
    const next = contract('v1.1.0', V1_PARAMS.slice(0, 3));
    const result = plan('v1.1.0', next);
    expect(result.status).toBe('changed');
    await applyImports(root, sources, [result]);
    const snapshot = readFileSync(
      join(root, `contracts/snapshot/${AGENT}.json`),
      'utf8',
    );
    expect(snapshot).toBe(canonicalJson(next));
    const written = JSON.parse(
      readFileSync(join(root, 'contracts/sources.json'), 'utf8'),
    );
    expect(written.agents[0].tag).toBe('v1.1.0');
    expect(written.agents[0].snapshotSha256).toBe(sha256(snapshot));
    expect(readdirSync(join(root, 'src/model/offers/generated'))).toEqual([
      'messaging.ts',
    ]);
  });

  it('writes the modules the snapshot regenerates, whatever the published key order', async () => {
    const published = contract('v1.1.0', V1_PARAMS);
    published.offers[0] = {
      ...published.offers[0],
      parameterRules: [
        {kind: 'anyOf', keys: ['namespace', 'tier'], id: 'r1', message: 'm'},
      ],
    } as (typeof published.offers)[0];
    await applyImports(root, sources, [plan('v1.1.0', published)]);
    const written = readFileSync(
      join(root, 'src/model/offers/generated/messaging.ts'),
      'utf8',
    );
    const regenerated = await generateFromSnapshot(root);
    expect(written).toBe(regenerated.get('messaging.ts'));
  });

  it('writes nothing when the generator refuses the contract', async () => {
    const before = readFileSync(join(root, 'contracts/sources.json'), 'utf8');
    const invalid = contract('v1.1.0', [{key: 'namespace', type: 'nope'}]);
    await expect(
      applyImports(root, sources, [plan('v1.1.0', invalid)]),
    ).rejects.toThrow('not a contract value type');
    expect(readFileSync(join(root, 'contracts/sources.json'), 'utf8')).toBe(
      before,
    );
    expect(readdirSync(join(root, 'src/model/offers/generated'))).toEqual([]);
  });
});
