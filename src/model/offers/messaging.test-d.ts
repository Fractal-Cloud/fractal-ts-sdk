/**
 * Type-level assertions for the messaging offers' config types, checked by `npm
 * run typecheck` (see storage.test-d.ts for why these are not in a `.test.ts`).
 */
import {AwsSesIdentity} from './messaging';

// `domain` is required; `mailFromSubdomain` is optional.
AwsSesIdentity({domain: 'example.com'});
AwsSesIdentity({domain: 'example.com', mailFromSubdomain: 'bounce'});
// @ts-expect-error `domain` is required.
AwsSesIdentity({});
// @ts-expect-error `domain` is required, `mailFromSubdomain` alone is not enough.
AwsSesIdentity({mailFromSubdomain: 'bounce'});
// @ts-expect-error `domain` is a string.
AwsSesIdentity({domain: 42});
// @ts-expect-error no other key is accepted.
AwsSesIdentity({domain: 'example.com', region: 'eu-central-1'});
