/**
 * Type-level assertions for the API-management offers' config types, checked by `npm run
 * typecheck` (see storage.test-d.ts for why these are not in a `.test.ts`).
 */
import {AwsCloudFront} from './api_management';

// A static site from a linked bucket: both site keys are optional.
AwsCloudFront({aliases: ['docs.example.com']});
AwsCloudFront({
  aliases: ['docs.example.com'],
  defaultRootObject: 'index.html',
  spaFallback: true,
});
// @ts-expect-error `spaFallback` is a boolean.
AwsCloudFront({spaFallback: 'true'});
// @ts-expect-error `rootObject` is not a key of this config — the agent reads `defaultRootObject`.
AwsCloudFront({rootObject: 'index.html'});
