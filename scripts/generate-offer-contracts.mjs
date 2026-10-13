/**
 * Regenerates src/model/offers/generated/ from the committed contract snapshot.
 * Offline and deterministic: the same snapshot always writes the same files.
 *
 *   npm run contracts:generate
 */
import {mkdirSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {
  GENERATED_DIR,
  generateFromSnapshot,
} from './offer-contracts/snapshot.mjs';

const root = process.cwd();
const files = await generateFromSnapshot(root);
const dir = join(root, GENERATED_DIR);
mkdirSync(dir, {recursive: true});
for (const name of readdirSync(dir)) {
  if (!files.has(name)) {
    rmSync(join(dir, name));
  }
}
for (const [name, text] of files) {
  writeFileSync(join(dir, name), text);
}
console.log(`Wrote ${files.size} modules to ${GENERATED_DIR}`);
