/**
 * Regenerates src/model/offers/generated/ from the committed contract snapshot.
 * Offline and deterministic: the same snapshot always writes the same files.
 *
 *   npm run contracts:generate
 */
import {
  GENERATED_DIR,
  generateFromSnapshot,
  writeGenerated,
} from './offer-contracts/snapshot.mjs';

const root = process.cwd();
const files = await generateFromSnapshot(root);
writeGenerated(root, files);
console.log(`Wrote ${files.size} modules to ${GENERATED_DIR}`);
