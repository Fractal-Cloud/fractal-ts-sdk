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
// Production access: a boolean and the details of its request, all optional.
AwsSesIdentity({
  domain: 'example.com',
  productionAccess: true,
  mailType: 'TRANSACTIONAL',
  websiteUrl: 'https://example.com',
  useCaseDescription: 'receipts',
  contactLanguage: 'EN',
});
// @ts-expect-error `productionAccess` is a boolean.
AwsSesIdentity({domain: 'example.com', productionAccess: 'yes'});
// @ts-expect-error `mailType` is TRANSACTIONAL or MARKETING.
AwsSesIdentity({domain: 'example.com', mailType: 'BULK'});
// @ts-expect-error `contactLanguage` is EN or JA.
AwsSesIdentity({domain: 'example.com', contactLanguage: 'DE'});
