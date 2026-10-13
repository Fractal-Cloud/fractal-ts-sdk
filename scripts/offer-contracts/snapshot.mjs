/**
 * Reading the committed contract snapshot and turning it into the generated
 * modules. Shared by the generate script and the test that keeps the generated
 * sources in step with the snapshot.
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import prettier from 'prettier';
import {
  buildModel,
  canonicalJson,
  formatModules,
  renderModules,
  sha256,
} from './generator.mjs';

export const SOURCES_FILE = 'contracts/sources.json';
export const SNAPSHOT_DIR = 'contracts/snapshot';
export const GENERATED_DIR = 'src/model/offers/generated';

export const snapshotFile = agentId => `${SNAPSHOT_DIR}/${agentId}.json`;

export const readSources = root =>
  JSON.parse(readFileSync(join(root, SOURCES_FILE), 'utf8'));

/**
 * Reads every snapshot the sources pin, refusing one that was edited by hand
 * (its digest no longer matches) or that is not the canonical text.
 */
export const readSnapshot = root =>
  readSources(root).agents.map(agent => {
    const text = readFileSync(join(root, snapshotFile(agent.agentId)), 'utf8');
    if (sha256(text) !== agent.snapshotSha256) {
      throw new Error(
        `offer contracts: ${snapshotFile(agent.agentId)} does not match the digest ` +
          `in ${SOURCES_FILE}; refresh it with npm run contracts:refresh, never by hand`,
      );
    }
    const projection = JSON.parse(text);
    if (canonicalJson(projection) !== text) {
      throw new Error(
        `offer contracts: ${snapshotFile(agent.agentId)} is not in canonical form`,
      );
    }
    if (
      projection.agentId !== agent.agentId ||
      projection.agentVersion !== agent.tag
    ) {
      throw new Error(
        `offer contracts: ${snapshotFile(agent.agentId)} holds ` +
          `${projection.agentId}@${projection.agentVersion}, the sources pin ` +
          `${agent.agentId}@${agent.tag}`,
      );
    }
    return projection;
  });

/** The generated modules, formatted, for the snapshot under `root`. */
export const generateFromSnapshot = async root => {
  const options =
    (await prettier.resolveConfig(join(root, GENERATED_DIR, 'x.ts'))) ?? {};
  return formatModules(
    renderModules(buildModel(readSnapshot(root))),
    prettier,
    options,
  );
};
