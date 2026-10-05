/**
 * Type-level assertions for the security offers' config types, checked by `npm run
 * typecheck` (see storage.test-d.ts for why these are not in a `.test.ts`).
 */
import {CertManager} from './security';

// The three keys the agent cannot default are required; the rest are optional.
CertManager({
  hostedZoneId: 'Z0123456789ABCDEFGHIJ',
  role: 'arn:aws:iam::123456789012:role/dns-01',
  email: 'ops@example.com',
});
CertManager({
  hostedZoneId: 'Z0123456789ABCDEFGHIJ',
  role: 'arn:aws:iam::123456789012:role/dns-01',
  email: 'ops@example.com',
  acmeServer: 'staging',
  clusterIssuerName: 'letsencrypt-staging',
  namespace: 'cert-manager',
});
// An ACME directory of another CA is an `https://` URL.
CertManager({
  hostedZoneId: 'Z0123456789ABCDEFGHIJ',
  role: 'arn:aws:iam::123456789012:role/dns-01',
  email: 'ops@example.com',
  acmeServer: 'https://acme.example.com/directory',
});
// @ts-expect-error `hostedZoneId`, `role` and `email` are required.
CertManager({});
// @ts-expect-error `email` is required.
CertManager({
  hostedZoneId: 'Z0123456789ABCDEFGHIJ',
  role: 'arn:aws:iam::123456789012:role/dns-01',
});
CertManager({
  hostedZoneId: 'Z0123456789ABCDEFGHIJ',
  role: 'arn:aws:iam::123456789012:role/dns-01',
  email: 'ops@example.com',
  // @ts-expect-error an ACME directory over plain http is not accepted.
  acmeServer: 'http://acme.example.com/directory',
});
CertManager({
  hostedZoneId: 'Z0123456789ABCDEFGHIJ',
  role: 'arn:aws:iam::123456789012:role/dns-01',
  email: 'ops@example.com',
  // @ts-expect-error `chartVersion` is pinned by the agent and is not a key.
  chartVersion: 'v1.21.2',
});
